import Foundation

actor APIClient {
    private let configuration: BackendConfiguration
    private let session: URLSession
    private let keychain: KeychainStore
    private var tokens: AuthTokens?
    private var refreshing: Task<AuthTokens, Error>?
    private var sessionGeneration = 0
    private let navigationCache = NavigationCache()
    private let phoneSetupCache = PhoneSetupCache()
    private var phoneSetupGeneration = 0
    private var cacheOwners: Set<UUID> = []
    #if DEBUG && targetEnvironment(simulator)
    private var blockedPaginationFixture = BlockedPaginationFixture()
    let caretakerRefreshFixture = CaretakerRefreshFixture()
    let onboardingRecoveryFixture = OnboardingRecoveryFixture()
    #endif

    init(configuration: BackendConfiguration) {
        self.configuration = configuration
        let settings = URLSessionConfiguration.ephemeral
        settings.timeoutIntervalForRequest = 15
        settings.urlCache = nil
        self.session = URLSession(configuration: settings, delegate: NoRedirectDelegate(), delegateQueue: nil)
        self.keychain = KeychainStore(service: "org.shield.auth.\(configuration.baseURL?.absoluteString ?? "unconfigured")")
        self.tokens = try? keychain.read()
        #if DEBUG && targetEnvironment(simulator)
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-offline-history") {
            // In-memory synthetic identity; no server or real Keychain account is used.
            let payload = Data(#"{"sub":"offline-history-fixture"}"#.utf8).base64EncodedString()
            self.tokens = AuthTokens(accessToken: "fixture.\(payload).fixture", refreshToken: "", expiresIn: 0)
        }
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-blocked-pagination") {
            let payload = Data(#"{"sub":"blocked-pagination-fixture"}"#.utf8).base64EncodedString()
            self.tokens = AuthTokens(accessToken: "fixture.\(payload).fixture", refreshToken: "", expiresIn: 0)
        }
        #endif
    }

    var hasSession: Bool { tokens != nil }

    /// A local namespace only; the server verifies authorization for every remote operation.
    var localAccountID: String? {
        guard let token = tokens?.accessToken else { return nil }
        let pieces = token.split(separator: ".")
        guard pieces.count == 3 else { return nil }
        var payload = String(pieces[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        payload += String(repeating: "=", count: (4 - payload.count % 4) % 4)
        guard let bytes = Data(base64Encoded: payload), let claims = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
              let subject = claims["sub"] as? String, !subject.isEmpty else { return nil }
        return "\(configuration.baseURL?.absoluteString ?? "unconfigured")|\(subject)"
    }

    nonisolated static func payload(_ object: [String: Any]) throws -> Data {
        try JSONSerialization.data(withJSONObject: object)
    }

    private func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { value in
            let text = try value.singleValueContainer().decode(String.self)
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: text) { return date }
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: text) else { throw APIError.invalidResponse }
            return date
        }
        return decoder
    }

    func invalidateNavigationCache() async {
        phoneSetupGeneration += 1
        await navigationCache.invalidate(preservingConfiguration: true)
        if let account = localAccountID { try? phoneSetupCache.invalidate(account: account) }
    }

    func blockedNumbers(participantID: UUID) async throws -> [BlockedNumber] {
        let generation = sessionGeneration, mutation = phoneSetupGeneration
        do {
            return try await BlockedNumbersLoader.load { cursor in
                try await self.blockedNumbersPage(cursor: cursor, participantID: participantID,
                                                 generation: generation, mutation: mutation)
            }
        } catch is URLError { throw APIError.connectionInterrupted }
    }

    private func blockedNumbersPage(cursor: String?, participantID: UUID, generation: Int, mutation: Int) async throws -> BlockedNumberPage {
        guard generation == sessionGeneration, mutation == phoneSetupGeneration else { throw CancellationError() }
        // The loader validates the opaque base64url cursor before it can reach this path.
        let path = "/api/blocked-numbers" + (cursor.map { "?cursor=\($0)" } ?? "")
        let page: BlockedNumberPage = try await send(path, participantID: participantID)
        guard generation == sessionGeneration, mutation == phoneSetupGeneration else { throw CancellationError() }
        return page
    }

    /// Explicitly requested by presentation code; live actions always use send().
    func savedPhoneSetup<T: Decodable & Sendable>(_ path: String, participantID: UUID) -> (value: T, savedAt: Date, isFresh: Bool)? {
        guard let account = localAccountID,
              let entry = phoneSetupCache.read(path, participant: participantID, account: account),
              let value = try? decoder().decode(T.self, from: entry.data) else { return nil }
        return (value, entry.savedAt, !entry.invalidated && Date.now.timeIntervalSince(entry.savedAt) < 300)
    }

    func removeSavedPhoneSetup(account: String) throws {
        phoneSetupGeneration += 1
        try phoneSetupCache.remove(account: account)
    }

    func cancelRestoration(participantID: UUID, session: UUID, settingsUnchanged: Bool) async throws -> RestorationStatus.Cancellation {
        let generation = sessionGeneration
        let receipt: RestorationStatus.Cancellation = try await send("/api/forwarding/restoration/cancel", method: "POST",
            body: Self.payload(["session": session.uuidString, "settingsUnchanged": settingsUnchanged]), participantID: participantID)
        guard generation == sessionGeneration else { throw CancellationError() }
        guard receipt.cancelled, receipt.session == session else { throw APIError.invalidResponse }
        if let account = localAccountID {
            try phoneSetupCache.applyCancellation(receipt, participant: participantID, account: account)
        }
        return receipt
    }

    func warmPhoneSetup(participantID: UUID) async {
        guard cacheOwners.contains(participantID) else { return }
        let saved: (value: SetupStatus, savedAt: Date, isFresh: Bool)? = savedPhoneSetup("/api/setup", participantID: participantID)
        guard saved?.isFresh != true else { return }
        let _: SetupStatus? = try? await send("/api/setup", participantID: participantID)
    }

    /// Home reuses a recent check with its original timestamp; setup actions still read fresh.
    func forwardingSnapshot(participantID: UUID) async throws -> (status: ForwardingStatus, checkedAt: Date) {
        let generation = sessionGeneration
        let setupGeneration = phoneSetupGeneration
        guard cacheOwners.contains(participantID) else {
            let status: ForwardingStatus = try await send("/api/forwarding", participantID: participantID)
            return (status, .now)
        }
        let saved: (value: ForwardingStatus, savedAt: Date, isFresh: Bool)? = savedPhoneSetup("/api/forwarding", participantID: participantID)
        if let saved, saved.isFresh, saved.value.participantId == participantID { return (saved.value, saved.savedAt) }
        let response = try await navigationCache.response(for: .init(path: "/api/forwarding", participantID: participantID), lifetime: 300) {
            try await self.data("/api/forwarding", participantID: participantID, expectedGeneration: generation)
        }
        guard generation == sessionGeneration, setupGeneration == phoneSetupGeneration else { throw CancellationError() }
        do {
            let status = try decoder().decode(ForwardingStatus.self, from: response.data)
            if setupGeneration == phoneSetupGeneration, let account = localAccountID {
                try? phoneSetupCache.save(response.data, path: "/api/forwarding", participant: participantID, account: account, now: response.fetchedAt)
            }
            return (status, response.fetchedAt)
        }
        catch { await navigationCache.invalidate(); throw error }
    }

    func send<T: Decodable & Sendable>(_ path: String, method: String = "GET", body: Data? = nil, participantID: UUID? = nil, authenticated: Bool = true) async throws -> T {
        let generation = sessionGeneration
        let setupGeneration = phoneSetupGeneration
        let result: Data
        let owner = participantID.map { cacheOwners.contains($0) } ?? false
        if method == "GET", body == nil,
           let lifetime = NavigationCache.lifetime(path: path, owner: owner, authenticated: authenticated) {
            result = try await navigationCache.data(for: .init(path: path, participantID: participantID), lifetime: lifetime) {
                try await self.data(path, participantID: participantID, authenticated: authenticated, expectedGeneration: generation)
            }
        } else {
            // Even an uncertain write may have reached the server. Never reuse pre-write values.
            let mutation = method != "GET" && !path.hasPrefix("/auth/") && path != "/api/devices"
            if mutation {
                phoneSetupGeneration += 1
                await navigationCache.invalidate(preservingConfiguration: true)
                if let account = localAccountID { try? phoneSetupCache.invalidate(account: account) }
            }
            do {
                result = try await data(path, method: method, body: body, participantID: participantID, authenticated: authenticated, expectedGeneration: generation)
            } catch {
                if mutation { await invalidateNavigationCache() }
                throw error
            }
            if mutation {
                phoneSetupGeneration += 1
                await navigationCache.invalidate(preservingConfiguration: true)
                if let account = localAccountID { try? phoneSetupCache.invalidate(account: account) }
            }
        }
        guard generation == sessionGeneration else { throw CancellationError() }
        let decoded: T
        do { decoded = try decoder().decode(T.self, from: result) }
        catch { await navigationCache.invalidate(); throw error }
        if path == "/api/people", let people = decoded as? APIResponses.People {
            let owners = Set(people.people.filter(\.isOwner).map(\.id))
            if owners != cacheOwners { await navigationCache.invalidate() }
            guard generation == sessionGeneration else { throw CancellationError() }
            cacheOwners = owners
            if let account = localAccountID { try? phoneSetupCache.retain(participants: owners, account: account) }
        }
        if method == "GET", setupGeneration == phoneSetupGeneration, owner, let participantID, let account = localAccountID {
            try? phoneSetupCache.save(result, path: path, participant: participantID, account: account)
        }
        return decoded
    }

    func data(_ path: String, method: String = "GET", body: Data? = nil, participantID: UUID? = nil, authenticated: Bool = true, retried: Bool = false, expectedGeneration: Int? = nil) async throws -> Data {
        let generation = expectedGeneration ?? sessionGeneration
        if authenticated, generation != sessionGeneration { throw CancellationError() }
        #if DEBUG && targetEnvironment(simulator)
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-onboarding-recovery"),
           let result = try await onboardingRecoveryFixture.response(path: path, method: method, body: body, participantID: participantID) { return result }
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-caretaker-refresh"),
           let result = try await caretakerRefreshFixture.response(path: path, method: method, body: body) { return result }
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-blocked-pagination"),
           let result = try blockedPaginationFixture.response(path: path, method: method) { return result }
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-cold-launch"), path == "/api/people" {
            // Keep the service pending so a real cached-owner launch must become usable first.
            try await Task.sleep(for: .seconds(6))
        }
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-call-filter-parity"),
           let filter = CallFilter.allCases.first(where: { path == "/api/calls?filter=\($0.rawValue)" }) {
            if filter == .voicemail { try await Task.sleep(for: .seconds(3)) }
            return try CallFilterFixture.page(filter)
        }
        if configuration.baseURL == nil, ProcessInfo.processInfo.arguments.contains("--uitesting-navigation-loading"),
           path == "/api/calls?filter=connected" || path == "/api/calls?filter=voicemail" || path == "/api/calls?filter=all" {
            // Synthetic slow, successful empty pages exercise refresh presentation without a service.
            if path != "/api/calls?filter=all" { try await Task.sleep(for: .seconds(5)) }
            return Data(#"{"calls":[],"nextCursor":null}"#.utf8)
        }
        #endif
        guard let baseURL = configuration.baseURL, path.hasPrefix("/"), !path.hasPrefix("//"),
              let url = URL(string: path, relativeTo: baseURL)?.absoluteURL,
              url.host == baseURL.host, url.scheme == baseURL.scheme, url.port == baseURL.port else { throw APIError.unconfigured }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if let participantID { request.setValue(participantID.uuidString, forHTTPHeaderField: "X-Shield-Participant") }
        if authenticated {
            guard let tokens else { throw APIError.service(code: "sign_in_required", status: 401) }
            request.setValue("Bearer \(tokens.accessToken)", forHTTPHeaderField: "Authorization")
        }
        let responsePair: (Data, URLResponse)
        do { responsePair = try await session.data(for: request) }
        catch {
            if Task.isCancelled { throw CancellationError() }
            if authenticated, generation != sessionGeneration { throw CancellationError() }
            throw error
        }
        let (result, response) = responsePair
        if authenticated, generation != sessionGeneration { throw CancellationError() }
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401, authenticated, !retried, let refreshToken = tokens?.refreshToken, !refreshToken.isEmpty {
            do { try await refreshSession(refreshToken) }
            catch {
                if generation != sessionGeneration { throw CancellationError() }
                throw error
            }
            guard generation == sessionGeneration else { throw CancellationError() }
            return try await data(path, method: method, body: body, participantID: participantID, authenticated: true, retried: true, expectedGeneration: generation)
        }
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 || http.statusCode == 403 {
                cacheOwners = []
                await navigationCache.invalidate()
            }
            let code = (try? decoder().decode(APIResponses.ErrorEnvelope.self, from: result))?.error.code ?? "request_failed"
            throw APIError.service(code: code, status: http.statusCode)
        }
        return result
    }

    func requestCode(email: String) async throws {
        let _: APIResponses.Empty = try await send("/auth/request-code", method: "POST", body: Self.payload(["email": email]), authenticated: false)
    }

    func requestPhoneCode(phone: String) async throws -> PhoneChallenge {
        try await send("/auth/phone/start", method: "POST", body: Self.payload(["phone": phone]), authenticated: false)
    }

    func signIn(challenge: String, code: String) async throws {
        let generation = sessionGeneration
        let result: AuthTokens = try await send("/auth/phone/verify", method: "POST", body: Self.payload(["challenge": challenge, "code": code]), authenticated: false)
        guard generation == sessionGeneration else { throw CancellationError() }
        try keychain.write(result)
        sessionGeneration += 1
        cacheOwners = []
        tokens = result
        await navigationCache.invalidate()
    }

    func signIn(email: String, code: String) async throws {
        let generation = sessionGeneration
        let result: AuthTokens = try await send("/auth/verify-code", method: "POST", body: Self.payload(["email": email, "code": code]), authenticated: false)
        guard generation == sessionGeneration else { throw CancellationError() }
        try keychain.write(result)
        sessionGeneration += 1
        cacheOwners = []
        tokens = result
        await navigationCache.invalidate()
    }

    private func refreshSession(_ token: String) async throws {
        let generation = sessionGeneration
        if let refreshing {
            let result = try await refreshing.value
            guard generation == sessionGeneration, tokens != nil else { throw CancellationError() }
            try keychain.write(result)
            tokens = result
            return
        }
        let task = Task<AuthTokens, Error> {
            try await self.send("/auth/refresh", method: "POST", body: Self.payload(["refreshToken": token]), authenticated: false)
        }
        refreshing = task
        defer { if generation == sessionGeneration { refreshing = nil } }
        do {
            let result = try await task.value
            guard generation == sessionGeneration else { throw CancellationError() }
            try keychain.write(result)
            tokens = result
        } catch {
            if generation == sessionGeneration, case let APIError.service(_, status) = error, status == 401 || status == 403 {
                tokens = nil; keychain.clear()
            }
            throw error
        }
    }

    func signOut() async {
        let previous = tokens?.accessToken
        sessionGeneration += 1
        cacheOwners = []
        refreshing?.cancel()
        refreshing = nil
        tokens = nil
        keychain.clear()
        await navigationCache.invalidate()
        if let previous, let baseURL = configuration.baseURL {
            var request = URLRequest(url: baseURL.appending(path: "auth/logout"))
            request.httpMethod = "POST"
            request.setValue("Bearer \(previous)", forHTTPHeaderField: "Authorization")
            _ = try? await session.data(for: request)
        }
    }
}

extension APIClient: ServiceAccessAPI {
    func serviceAccess(refresh: Bool) async throws -> ServiceAccessStatus {
        if refresh { return try await send("/api/access/refresh", method: "POST", body: Self.payload([:])) }
        return try await send("/api/access")
    }
}

import Foundation

actor APIClient {
    private let configuration: BackendConfiguration
    private let session: URLSession
    private let keychain: KeychainStore
    private var tokens: AuthTokens?
    private var refreshing: Task<AuthTokens, Error>?
    private var sessionGeneration = 0

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

    func send<T: Decodable & Sendable>(_ path: String, method: String = "GET", body: Data? = nil, participantID: UUID? = nil, authenticated: Bool = true) async throws -> T {
        let data = try await data(path, method: method, body: body, participantID: participantID, authenticated: authenticated)
        return try decoder().decode(T.self, from: data)
    }

    func data(_ path: String, method: String = "GET", body: Data? = nil, participantID: UUID? = nil, authenticated: Bool = true, retried: Bool = false, expectedGeneration: Int? = nil) async throws -> Data {
        let generation = expectedGeneration ?? sessionGeneration
        if authenticated, generation != sessionGeneration { throw CancellationError() }
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
        tokens = result
    }

    func signIn(email: String, code: String) async throws {
        let generation = sessionGeneration
        let result: AuthTokens = try await send("/auth/verify-code", method: "POST", body: Self.payload(["email": email, "code": code]), authenticated: false)
        guard generation == sessionGeneration else { throw CancellationError() }
        try keychain.write(result)
        sessionGeneration += 1
        tokens = result
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
        refreshing?.cancel()
        refreshing = nil
        tokens = nil
        keychain.clear()
        if let previous, let baseURL = configuration.baseURL {
            var request = URLRequest(url: baseURL.appending(path: "auth/logout"))
            request.httpMethod = "POST"
            request.setValue("Bearer \(previous)", forHTTPHeaderField: "Authorization")
            _ = try? await session.data(for: request)
        }
    }
}

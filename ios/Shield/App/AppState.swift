import Foundation
import Observation
import UIKit
import UserNotifications

@MainActor
@Observable
final class AppState {
    let api: APIClient
    let configuration: BackendConfiguration
    var signedIn = false
    var isPreview = false
    var isDemo = false
    /// Debug-simulator-only sample account that also shows owner-only screens the demo hides. Never contacts the service.
    var isTestAccount = false
    var people: [Person] = []
    var selectedPersonID: UUID?
    var overview: Overview?
    var calls: [CallRecord] = []
    var nextCursor: String?
    var filter: CallFilter = .all
    private var callsFilter: CallFilter = .all
    var isLoading = false
    var isLoadingCalls = false
    var callsError: String?
    var contextError: String?
    var errorMessage: String?
    var showingError = false
    var service: ServiceConfiguration?
    var selectedTab = 0
    /// These choices affect synthetic messages only; keeping real messages is a proposed feature.
    var demoKeptMessages: Set<UUID> = []
    var protectionOnboarding: ForwardingStatus.Monitoring?
    /// Ask about optional contacts only after phone setup has passed its call checks.
    var trustedContactsOnboarding = false
    var protectionParticipantID: UUID?
    private var protectionChoiceGeneration = 0
    private(set) var sessionGeneration = 0
    #if DEBUG && targetEnvironment(simulator)
    private var accountFixtureInitialRefresh = true
    #endif

    var person: Person? { people.first { $0.id == selectedPersonID } }
    var canListen: Bool { person?.canListen ?? false }
    var isOwner: Bool { person?.isOwner ?? false }
    var isTrial: Bool { service?.mode == "trial" && !isDemo }

    init(configuration: BackendConfiguration = .bundled) {
        self.configuration = configuration
        self.api = APIClient(configuration: configuration)
        #if DEBUG
        #if targetEnvironment(simulator)
        if ScreenPreview.requested != nil { exploreDemo() }
        #endif
        if ProcessInfo.processInfo.arguments.contains("--uitesting-preview") || ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") { exploreDemo() }
        if ProcessInfo.processInfo.arguments.contains("--uitesting-protection-onboarding") {
            exploreDemo()
            protectionParticipantID = selectedPersonID
            protectionOnboarding = .init(available: true, enabled: false, consentVersion: "ui-test", choiceRecorded: false)
        }
        if ProcessInfo.processInfo.arguments.contains("--uitesting-trusted-contacts") {
            if !isDemo { exploreDemo() }
            protectionParticipantID = selectedPersonID
            trustedContactsOnboarding = true
        }
        #if targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--uitesting-account-error") {
            signedIn = true
            isPreview = true
            contextError = "Your connection was interrupted. Please try again."
        }
        #endif
        #endif
    }

    func restoreSession() async {
        guard !signedIn else { return }
        let generation = sessionGeneration
        if await api.hasSession {
            guard generation == sessionGeneration, !signedIn else { return }
            signedIn = true
            await refresh()
        }
    }

    func exploreDemo() {
        startPreview(testAccount: false)
    }

    private func startPreview(testAccount: Bool) {
        isTestAccount = testAccount
        protectionOnboarding = nil
        trustedContactsOnboarding = false
        protectionParticipantID = nil
        sessionGeneration += 1
        isPreview = true
        isDemo = true
        people = DemoData.people
        selectedPersonID = DemoData.participant.id
        loadPreview()
        signedIn = true
    }

    func didSignIn() async {
        protectionOnboarding = nil
        trustedContactsOnboarding = false
        protectionParticipantID = nil
        sessionGeneration += 1
        isPreview = false
        signedIn = true
        await refresh()
    }

    func select(_ person: Person) async {
        protectionOnboarding = nil
        trustedContactsOnboarding = false
        protectionParticipantID = nil
        selectedPersonID = person.id
        overview = nil
        calls = []
        nextCursor = nil
        filter = .all
        callsError = nil
        contextError = nil
        isLoadingCalls = false
        if isPreview { loadPreview() } else {
            await loadProtectionOnboarding(generation: sessionGeneration)
            await loadContext()
        }
    }

    func refresh() async {
        #if DEBUG && targetEnvironment(simulator)
        if isPreview, ProcessInfo.processInfo.arguments.contains("--uitesting-account-error") {
            // The app refreshes once on activation; leave the failed state for the explicit retry.
            if accountFixtureInitialRefresh { accountFixtureInitialRefresh = false; return }
            exploreDemo()
            return
        }
        #endif
        if isPreview { loadPreview(); return }
        guard signedIn else { return }
        let generation = sessionGeneration
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponses.People = try await api.send("/api/people")
            guard generation == sessionGeneration, signedIn, !isPreview else { return }
            people = response.people
            isDemo = response.isDemo
            if !people.contains(where: { $0.id == selectedPersonID }) {
                selectedPersonID = people.first?.id
                overview = nil
                calls = []
            }
            let configuration: ServiceConfiguration = try await api.send("/public/config", authenticated: false)
            guard generation == sessionGeneration, signedIn, !isPreview else { return }
            service = configuration
            contextError = nil
            if configuration.notificationsAvailable, !isDemo {
                let settings = await UNUserNotificationCenter.current().notificationSettings()
                guard generation == sessionGeneration, signedIn else { return }
                if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            await loadProtectionOnboarding(generation: generation)
            await loadContext()
            await syncCallDirectory(generation: generation)
        } catch { if generation == sessionGeneration { contextError = error.localizedDescription; handleSessionFailure(error) } }
    }

    /// Only the protected person's own phone blocks their scammers; a helper's phone never does.
    private func syncCallDirectory(generation: Int) async {
        guard isOwner, !isDemo, let id = selectedPersonID,
              let response: APIResponses.BlockedNumbers = try? await api.send("/api/blocked-numbers", participantID: id),
              generation == sessionGeneration, selectedPersonID == id else { return }
        await CallDirectorySync.update(phones: response.items.map(\.phone))
    }

    private func loadProtectionOnboarding(generation: Int) async {
        guard let id = selectedPersonID, isOwner, !isDemo else { return }
        let choiceGeneration = protectionChoiceGeneration
        guard let status: ForwardingStatus = try? await api.send("/api/forwarding", participantID: id),
              generation == sessionGeneration, choiceGeneration == protectionChoiceGeneration,
              signedIn, selectedPersonID == id else { return }
        // Offer optional contacts only when their request-delivery service is configured.
        let contacts: TrustedContactsResponse? = try? await api.send("/api/trusted-contacts", participantID: id)
        guard generation == sessionGeneration, choiceGeneration == protectionChoiceGeneration, signedIn, selectedPersonID == id else { return }
        if let monitoring = status.monitoring, monitoring.available, monitoring.choiceRecorded == false {
            protectionOnboarding = monitoring
        } else {
            protectionOnboarding = nil
        }
        trustedContactsOnboarding = contacts?.available == true && contacts?.choiceRecorded == false
            && status.ringTestAt != nil && status.forwardingTestAt != nil && status.stage == "checks" && !status.restorationRequested
        protectionParticipantID = protectionOnboarding != nil || trustedContactsOnboarding ? id : nil
    }

    func completeProtectionOnboarding(enabled: Bool, participantID: UUID, version: String) async throws {
        guard signedIn, selectedPersonID == participantID, protectionParticipantID == participantID else { throw APIError.invalidResponse }
        let generation = sessionGeneration
        if !isPreview {
            let body: [String: Any] = enabled ? ["enabled": true, "version": version] : ["enabled": false]
            let _: APIResponses.Empty = try await api.send("/api/forwarding/monitoring", method: "POST",
                body: APIClient.payload(body), participantID: participantID)
        }
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--protection-save-fails") { throw APIError.invalidResponse }
        #endif
        guard generation == sessionGeneration, selectedPersonID == participantID else { return }
        protectionChoiceGeneration += 1
        protectionOnboarding = nil
        if !trustedContactsOnboarding { protectionParticipantID = nil }
    }

    func completeTrustedContacts(enabled: Bool, participantID: UUID) async throws {
        let generation = sessionGeneration
        if !isPreview {
            let _: APIResponses.Empty = try await api.send("/api/trusted-contacts/choice", method: "POST",
                body: APIClient.payload(["enabled": enabled]), participantID: participantID)
        }
        guard generation == sessionGeneration, selectedPersonID == participantID else { return }
        protectionChoiceGeneration += 1
        trustedContactsOnboarding = false
        if protectionOnboarding == nil { protectionParticipantID = nil }
    }

    func loadContext() async {
        guard let id = selectedPersonID else { return }
        if isPreview { loadPreview(); return }
        let generation = sessionGeneration
        let requestedFilter = filter
        do {
            async let summary: Overview = api.send("/api/overview", participantID: id)
            async let activity: APIResponses.Calls = api.send("/api/calls?filter=\(requestedFilter.rawValue)", participantID: id)
            let (newOverview, page) = try await (summary, activity)
            guard selectedPersonID == id, generation == sessionGeneration, requestedFilter == filter else { return }
            overview = newOverview
            contextError = nil
            callsError = nil
            calls = page.calls
            callsFilter = requestedFilter
            nextCursor = page.nextCursor
        } catch { if generation == sessionGeneration, selectedPersonID == id { contextError = error.localizedDescription; handleSessionFailure(error) } }
    }

    func loadCalls(more: Bool = false) async {
        guard let id = selectedPersonID else { return }
        if callsFilter != filter {
            calls = []
            nextCursor = nil
            callsFilter = filter
        }
        if isPreview {
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "--uitesting-calls-state"), args.indices.contains(i + 1) {
                let state = args[i + 1]
                calls = []
                nextCursor = nil
                isLoadingCalls = state == "loading"
                callsError = state == "error" ? "Your connection was interrupted. Please try again." : nil
                return
            }
            #endif
            callsError = nil
            calls = (person.map(DemoData.overview)?.recent ?? []).filter(filter.includes)
            nextCursor = nil
            return
        }
        let requestedFilter = filter
        let generation = sessionGeneration
        isLoadingCalls = true
        callsError = nil
        defer { if generation == sessionGeneration, selectedPersonID == id, filter == requestedFilter { isLoadingCalls = false } }
        let cursor = more ? nextCursor : nil
        var path = "/api/calls?filter=\(requestedFilter.rawValue)"
        if let cursor { path += "&cursor=\(cursor)" }
        do {
            let page: APIResponses.Calls = try await api.send(path, participantID: id)
            guard selectedPersonID == id, filter == requestedFilter, generation == sessionGeneration else { return }
            calls = more ? calls + page.calls : page.calls
            nextCursor = page.nextCursor
        } catch { if generation == sessionGeneration, selectedPersonID == id, filter == requestedFilter { callsError = error.localizedDescription; handleSessionFailure(error) } }
    }

    func showCalls(_ selectedFilter: CallFilter) {
        if selectedFilter == .voicemail { selectedTab = 2; return }
        filter = selectedFilter
        selectedTab = 1
    }

    #if DEBUG && targetEnvironment(simulator)
    /// Typed into the email field on the simulator to open the local test account. Not compiled into device or release builds.
    static let testAccountSequence = "shield-test-account1"

    func exploreTestAccount() {
        startPreview(testAccount: true)
    }
    #endif

    func signOut() async {
        isTestAccount = false
        sessionGeneration += 1
        demoKeptMessages = []
        signedIn = false
        isPreview = false
        isDemo = false
        people = []
        selectedPersonID = nil
        overview = nil
        calls = []
        service = nil
        protectionOnboarding = nil
        trustedContactsOnboarding = false
        protectionParticipantID = nil
        selectedTab = 0
        callsError = nil
        contextError = nil
        isLoadingCalls = false
        errorMessage = nil
        showingError = false
        await api.signOut()
    }

    func handleSessionFailure(_ error: Error) {
        if case let APIError.service(_, status) = error, status == 401 || status == 403 { handle(error) }
    }

    func handle(_ error: Error) {
        if error is CancellationError { return }
        if case let APIError.service(code, status) = error {
            if status == 401 { signedIn = false; people = []; selectedPersonID = nil; overview = nil; calls = [] }
            if status == 403 && code == "access_denied" {
                people.removeAll { $0.id == selectedPersonID }
                selectedPersonID = people.first?.id
                overview = nil
                calls = []
            }
        }
        errorMessage = error.localizedDescription
        showingError = true
    }

    private func loadPreview() {
        guard let person else { return }
        let preview = DemoData.overview(for: person)
        overview = preview
        contextError = nil
        callsError = nil
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "--redesign-state"), args.indices.contains(i + 1) {
            let state = args[i + 1]
            if state == "paused" || state == "restoring" || state == "empty" || state == "legacy" {
                let counts = state == "legacy"
                    ? Overview.Counts(total: preview.counts.total, held: preview.counts.held,
                                      connected: preview.counts.connected, messages: preview.counts.messages, stoppedTotal: nil)
                    : state == "empty" ? .init(total: 0, held: 0, connected: 0, messages: 0, stoppedTotal: 0) : preview.counts
                overview = Overview(name: preview.name, status: state, lastTestAt: preview.lastTestAt, isDemo: true,
                                    isOwner: preview.isOwner, canListen: preview.canListen,
                                    counts: counts,
                                    recent: state == "empty" ? [] : preview.recent)
            }
            if state == "loading" { overview = nil; isLoading = true }
        }
        #endif
        calls = preview.recent.filter(filter.includes)
        callsFilter = filter
        nextCursor = nil
    }
}

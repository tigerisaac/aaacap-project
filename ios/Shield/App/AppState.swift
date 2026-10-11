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
    var people: [Person] = []
    var selectedPersonID: UUID?
    var overview: Overview?
    var calls: [CallRecord] = []
    var nextCursor: String?
    var filter: CallFilter = .all
    var isLoading = false
    var errorMessage: String?
    var showingError = false
    var service: ServiceConfiguration?
    var selectedTab = 0
    var protectionOnboarding: ForwardingStatus.Monitoring?
    /// The person hasn't chosen yet whether their helpers get alerts, and push alerts are available.
    var helperAlertsOnboarding = false
    var protectionParticipantID: UUID?
    private var protectionChoiceGeneration = 0
    private var sessionGeneration = 0

    var person: Person? { people.first { $0.id == selectedPersonID } }
    var canListen: Bool { person?.canListen ?? false }
    var isOwner: Bool { person?.isOwner ?? false }
    var isTrial: Bool { service?.mode == "trial" && !isDemo }

    init(configuration: BackendConfiguration = .bundled) {
        self.configuration = configuration
        self.api = APIClient(configuration: configuration)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--uitesting-preview") || ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") { exploreDemo() }
        if ProcessInfo.processInfo.arguments.contains("--uitesting-protection-onboarding") {
            exploreDemo()
            protectionParticipantID = selectedPersonID
            protectionOnboarding = .init(available: true, enabled: false, consentVersion: "ui-test", choiceRecorded: false)
        }
        if ProcessInfo.processInfo.arguments.contains("--uitesting-helper-alerts-onboarding") {
            if !isDemo { exploreDemo() }
            protectionParticipantID = selectedPersonID
            helperAlertsOnboarding = true
        }
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
        protectionOnboarding = nil
        helperAlertsOnboarding = false
        protectionParticipantID = nil
        sessionGeneration += 1
        isPreview = true
        isDemo = true
        signedIn = true
        people = DemoData.people
        selectedPersonID = DemoData.participant.id
        loadPreview()
    }

    func didSignIn() async {
        protectionOnboarding = nil
        helperAlertsOnboarding = false
        protectionParticipantID = nil
        sessionGeneration += 1
        isPreview = false
        signedIn = true
        await refresh()
    }

    func select(_ person: Person) async {
        protectionOnboarding = nil
        helperAlertsOnboarding = false
        protectionParticipantID = nil
        selectedPersonID = person.id
        overview = nil
        calls = []
        nextCursor = nil
        filter = .all
        if isPreview { loadPreview() } else {
            await loadProtectionOnboarding(generation: sessionGeneration)
            await loadContext()
        }
    }

    func refresh() async {
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
        } catch { if generation == sessionGeneration { handle(error) } }
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
        // A service without push alerts reads as nothing to ask.
        let helpers: APIResponses.HelperAlerts? = try? await api.send("/api/helper-alerts", participantID: id)
        guard generation == sessionGeneration, choiceGeneration == protectionChoiceGeneration, signedIn, selectedPersonID == id else { return }
        if let monitoring = status.monitoring, monitoring.available, monitoring.choiceRecorded == false {
            protectionOnboarding = monitoring
        } else {
            protectionOnboarding = nil
        }
        helperAlertsOnboarding = helpers?.available == true && helpers?.choiceRecorded == false
        protectionParticipantID = protectionOnboarding != nil || helperAlertsOnboarding ? id : nil
    }

    /// `enabled` is the connected-call protection choice and `helperAlerts` the helper-alert choice; nil means it wasn't asked.
    func completeProtectionOnboarding(enabled: Bool?, helperAlerts: Bool?, participantID: UUID, version: String?) async throws {
        guard signedIn, selectedPersonID == participantID, protectionParticipantID == participantID else {
            throw APIError.invalidResponse
        }
        let generation = sessionGeneration
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--uitesting-protection-onboarding") || arguments.contains("--uitesting-helper-alerts-onboarding") {
            if arguments.contains("--protection-save-fails") { throw APIError.invalidResponse }
            protectionOnboarding = nil
            helperAlertsOnboarding = false
            protectionParticipantID = nil
            return
        }
        #endif
        if let enabled, let version {
            let body: [String: Any] = enabled ? ["enabled": true, "version": version] : ["enabled": false]
            let _: APIResponses.Empty = try await api.send("/api/forwarding/monitoring", method: "POST",
                body: APIClient.payload(body), participantID: participantID)
        }
        if let helperAlerts {
            let _: APIResponses.Empty = try await api.send("/api/helper-alerts", method: "POST",
                body: APIClient.payload(["enabled": helperAlerts]), participantID: participantID)
        }
        guard generation == sessionGeneration, selectedPersonID == participantID else { return }
        protectionChoiceGeneration += 1
        protectionOnboarding = nil
        helperAlertsOnboarding = false
        protectionParticipantID = nil
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
            calls = page.calls
            nextCursor = page.nextCursor
        } catch { if generation == sessionGeneration, selectedPersonID == id { handle(error) } }
    }

    func loadCalls(more: Bool = false) async {
        guard let id = selectedPersonID else { return }
        if isPreview {
            calls = (person.map(DemoData.overview)?.recent ?? []).filter(filter.includes)
            nextCursor = nil
            return
        }
        let requestedFilter = filter
        let generation = sessionGeneration
        let cursor = more ? nextCursor : nil
        var path = "/api/calls?filter=\(requestedFilter.rawValue)"
        if let cursor { path += "&cursor=\(cursor)" }
        do {
            let page: APIResponses.Calls = try await api.send(path, participantID: id)
            guard selectedPersonID == id, filter == requestedFilter, generation == sessionGeneration else { return }
            calls = more ? calls + page.calls : page.calls
            nextCursor = page.nextCursor
        } catch { if generation == sessionGeneration, selectedPersonID == id, filter == requestedFilter { handle(error) } }
    }

    func showCalls(_ selectedFilter: CallFilter) {
        filter = selectedFilter
        selectedTab = 1
    }

    func signOut() async {
        sessionGeneration += 1
        signedIn = false
        isPreview = false
        isDemo = false
        people = []
        selectedPersonID = nil
        overview = nil
        calls = []
        service = nil
        protectionOnboarding = nil
        helperAlertsOnboarding = false
        protectionParticipantID = nil
        selectedTab = 0
        errorMessage = nil
        showingError = false
        await api.signOut()
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
        calls = preview.recent.filter(filter.includes)
        nextCursor = nil
    }
}

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
    private var sessionGeneration = 0

    var person: Person? { people.first { $0.id == selectedPersonID } }
    var canListen: Bool { person?.canListen ?? false }
    var isOwner: Bool { person?.isOwner ?? false }
    var isTrial: Bool { service?.mode == "trial" && !isDemo }

    init(configuration: BackendConfiguration = .bundled) {
        self.configuration = configuration
        self.api = APIClient(configuration: configuration)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--uitesting-preview") { exploreDemo() }
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
        sessionGeneration += 1
        isPreview = true
        isDemo = true
        signedIn = true
        people = DemoData.people
        selectedPersonID = DemoData.participant.id
        loadPreview()
    }

    func didSignIn() async {
        sessionGeneration += 1
        isPreview = false
        signedIn = true
        await refresh()
    }

    #if DEBUG
    func connectLocalDemo(caregiver: Bool = false) async {
        do {
            try await api.connectDemo(caregiver: caregiver)
            sessionGeneration += 1
            isPreview = false
            signedIn = true
            await refresh()
        } catch { handle(error) }
    }
    #endif

    func select(_ person: Person) async {
        selectedPersonID = person.id
        overview = nil
        calls = []
        nextCursor = nil
        filter = .all
        if isPreview { loadPreview() } else { await loadContext() }
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
            await loadContext()
        } catch { if generation == sessionGeneration { handle(error) } }
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

import Foundation
import Observation

@MainActor
@Observable
final class VoicemailInbox {
    var calls: [CallRecord] = []
    var loading = false
    private(set) var hasLoaded = false
    private var participantID: UUID?
    private var sessionGeneration: Int?
    var error: String?
    private(set) var nextCursor: String?
    private var generation = 0

    func load(_ app: AppState, more: Bool = false) async {
        guard let person = app.person else { return }
        if participantID != person.id || sessionGeneration != app.sessionGeneration {
            calls = []
            nextCursor = nil
            hasLoaded = false
            participantID = person.id
            sessionGeneration = app.sessionGeneration
        }
        generation += 1
        let request = generation
        let session = app.sessionGeneration
        let preview = app.isPreview
        loading = true
        error = nil
        defer { if generation == request { loading = false } }
        if preview {
            calls = DemoData.overview(for: person).recent.filter { $0.voicemail != nil }
            nextCursor = nil
            hasLoaded = true
            return
        }
        let local = app.savedCalls(for: person)
        if !more {
            // Keep the current owner snapshot on screen, even when it is an empty inbox.
            // Shared helper data still requires a fresh authorization check.
            let existing = person.isOwner ? calls : []
            calls = Array(Dictionary((existing + local).map { ($0.id, $0) }, uniquingKeysWith: { _, latest in latest }).values)
                .sorted { $0.occurredAt > $1.occurredAt }
        }
        var path = "/api/calls?filter=voicemail"
        if more, let nextCursor { path += "&cursor=\(nextCursor)" }
        do {
            let page: APIResponses.Calls = try await app.api.send(path, participantID: person.id)
            guard request == generation, app.sessionGeneration == session, app.signedIn, app.selectedPersonID == person.id, app.isPreview == preview else { return }
            let remote = more ? calls + page.calls : page.calls
            calls = Array(Dictionary((local + remote).map { ($0.id, $0) }, uniquingKeysWith: { _, latest in latest }).values)
                .sorted { $0.occurredAt > $1.occurredAt }
            nextCursor = page.nextCursor
            hasLoaded = true
            await app.saveOfflineHistory(page: page.calls)
            app.startAudioSync()
        } catch is CancellationError { return }
        catch {
            guard request == generation, app.sessionGeneration == session, app.signedIn, app.selectedPersonID == person.id else { return }
            self.error = error.localizedDescription
            if case let APIError.service(_, status) = error, status == 401 || status == 403 { app.handle(error) }
        }
    }
}

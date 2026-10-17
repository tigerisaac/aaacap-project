import Foundation
import Observation

@MainActor
@Observable
final class VoicemailInbox {
    var calls: [CallRecord] = []
    var loading = false
    var error: String?
    private(set) var nextCursor: String?
    private var generation = 0

    func load(_ app: AppState, more: Bool = false) async {
        guard let person = app.person else { return }
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
            return
        }
        let local = app.savedCalls(for: person)
        if !more { calls = local.sorted { $0.occurredAt > $1.occurredAt } }
        var path = "/api/calls?filter=voicemail"
        if more, let nextCursor { path += "&cursor=\(nextCursor)" }
        do {
            let page: APIResponses.Calls = try await app.api.send(path, participantID: person.id)
            guard request == generation, app.sessionGeneration == session, app.signedIn, app.selectedPersonID == person.id, app.isPreview == preview else { return }
            let remote = more ? calls + page.calls : page.calls
            calls = Array(Dictionary((local + remote).map { ($0.id, $0) }, uniquingKeysWith: { _, latest in latest }).values)
                .sorted { $0.occurredAt > $1.occurredAt }
            nextCursor = page.nextCursor
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

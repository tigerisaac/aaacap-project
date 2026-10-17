import Foundation

extension AppState {
    func loadLocalMessages() async {
        let generation = sessionGeneration
        guard signedIn, !isPreview, let account = await api.localAccountID else { return }
        await messageAudio.activate(account)
        let saved = (try? await messageAudio.store.all(account: account)) ?? []
        guard signedIn, generation == sessionGeneration else { return }
        localMessages = saved
        // Restore only the owner's own local library. Helpers always require current server access.
        if people.isEmpty {
            people = Array(Dictionary(saved.map { ($0.person.id, $0.person) }, uniquingKeysWith: { first, _ in first }).values)
            selectedPersonID = people.first?.id
        }
    }

    func startAudioSync() {
        guard signedIn, !isPreview, !isDemo, audioSyncTask == nil else { return }
        audioSyncTask = Task { await syncMessageAudio(); audioSyncTask = nil }
    }

    func syncMessageAudio() async {
        let generation = sessionGeneration
        guard signedIn, !isPreview, let account = await api.localAccountID else { return }
        await messageAudio.activate(account)
        audioSyncError = nil
        for person in people where person.isOwner && person.canListen {
            do {
                var cursor: String?
                repeat {
                    try Task.checkCancellation()
                    var path = "/api/calls?filter=all"
                    if let cursor { path += "&cursor=\(cursor)" }
                    let page: APIResponses.Calls = try await api.send(path, participantID: person.id)
                    guard generation == sessionGeneration, signedIn else { return }
                    for call in page.calls {
                        try Task.checkCancellation()
                        if call.voicemail == nil || call.voicemail?.status == "removed" {
                            try await messageAudio.forget(account: account, id: call.id)
                        } else if call.voicemail?.status == "ready" {
                            do { _ = try await messageAudio.receive(call: call, person: person, account: account) }
                            catch MessageAudioError.unavailable { continue }
                            catch {
                                if error is CancellationError { throw error }
                                if case let APIError.service(_, status) = error, status == 401 || status == 403 { throw error }
                                audioSyncError = "Some recordings haven’t reached this iPhone yet. Open Shield with a connection within 24 hours of the call."
                            }
                        }
                    }
                    cursor = page.nextCursor
                } while cursor != nil
            } catch is CancellationError { return }
            catch { handleSessionFailure(error); audioSyncError = "Open Shield with a connection to save new recordings on this iPhone." }
        }
        let saved = try? await messageAudio.store.all(account: account)
        guard generation == sessionGeneration, signedIn else { return }
        if let saved { localMessages = saved }
    }

    func savedCalls(for person: Person) -> [CallRecord] {
        guard signedIn, person.isOwner, person.canListen else { return [] }
        return localMessages.filter { $0.person.id == person.id }.map(\.call)
    }

    func messageAudioData(call: CallRecord, person: Person) async throws -> Data {
        guard signedIn, canListen, selectedPersonID == person.id else { throw CancellationError() }
        if !person.isOwner { return try await api.data("/api/voicemails/\(call.id)/audio", participantID: person.id) }
        guard let account = await api.localAccountID else { throw CancellationError() }
        await messageAudio.activate(account)
        // Playback of an already verified local recording does not wait for the network.
        if let saved = try await messageAudio.store.load(account: account, id: call.id) {
            guard saved.person.id == person.id else { throw CancellationError() }
            return saved.delivery.audio
        }
        let data = try await messageAudio.receive(call: call, person: person, account: account)
        await loadLocalMessages()
        return data
    }

    func deleteMessage(_ id: UUID, personID: UUID) async throws {
        guard signedIn, isOwner, selectedPersonID == personID, let account = await api.localAccountID else { throw CancellationError() }
        do {
            let _: APIResponses.Empty = try await api.send("/api/voicemails/\(id)", method: "DELETE", participantID: personID)
        } catch {
            // Old call metadata may already have expired; its local recording is still deletable.
            guard case let APIError.service(code, status) = error, status == 404, code == "voicemail_not_found" else { throw error }
        }
        try await messageAudio.forget(account: account, id: id)
        localMessages.removeAll { $0.call.id == id && $0.person.id == personID }
    }

    func deleteLocalMessageLibrary() async throws {
        guard let account = await api.localAccountID else { return }
        audioSyncTask?.cancel()
        try await messageAudio.removeAccount(account)
        localMessages = []
    }
}

import Foundation

extension AppState {
    private struct DeletionStatus: Decodable { let restorationRequired: Bool }

    func deleteAccount() async throws {
        guard signedIn, !isDemo, !isPreview, !isDeletingAccount else { return }
        isDeletingAccount = true
        defer { isDeletingAccount = false }
        let session = sessionGeneration
        let status: DeletionStatus = try await api.send("/api/account/deletion")
        guard signedIn, sessionGeneration == session else { throw CancellationError() }
        if status.restorationRequired {
            throw APIError.service(code: "restore_forwarding_before_deletion", status: 409)
        }
        // Stop outstanding reads/writes before local erasure. Clear local files first:
        // deleting the login must not strand encrypted files that a later retry cannot reach.
        invalidateAccountLoads()
        let deletionSession = sessionGeneration
        guard let account = await api.localAccountID else { throw APIError.invalidResponse }
        await messageAudio.activate(account)
        try await deleteLocalMessageLibrary()
        guard signedIn, sessionGeneration == deletionSession else { throw CancellationError() }
        let _: APIResponses.Empty = try await api.send("/api/account/delete", method: "POST")
        await CallDirectorySync.update(phones: [])
        await signOut()
    }
}

import Foundation

extension AppState {
    private struct DeletionRequest: Decodable { let receipt: String }
    private struct ReceiptStatus: Decodable { let state: String }
    var deletionReceiptKey: String { "shield-account-deletion-" + (configuration.baseURL?.absoluteString ?? "unconfigured") }
    func saveDeletionReceipt(_ receipt: String, account: String? = nil) {
        if let account { UserDefaults.standard.set(account, forKey: deletionReceiptKey + "-account") }
        UserDefaults.standard.set(receipt, forKey: deletionReceiptKey)
        deletionReceipt = receipt
    }
    func markDeletionSubmitted() {
        UserDefaults.standard.set(true, forKey: deletionReceiptKey + "-submitted")
        deletionSubmitted = true
    }
    func clearDeletionReceipt() {
        UserDefaults.standard.removeObject(forKey: deletionReceiptKey)
        UserDefaults.standard.removeObject(forKey: deletionReceiptKey + "-account")
        UserDefaults.standard.removeObject(forKey: deletionReceiptKey + "-submitted")
        deletionSubmitted = false
        deletionReceipt = nil
    }
    func deleteAccount(contactCopies: [UUID] = [], restoreContacts: Bool = true) async throws {
        guard signedIn, !isDemo, !isPreview, !isDeletingAccount else { return }
        isDeletingAccount = true
        defer { isDeletingAccount = false }
        let session = sessionGeneration
        let status: AccountDeletionStatus = try await api.send("/api/account/deletion")
        guard signedIn, sessionGeneration == session else { throw CancellationError() }
        if status.restorationRequired { throw APIError.service(code: "restore_forwarding_before_deletion", status: 409) }
        for id in contactCopies {
            if restoreContacts { try await PhoneContacts.shared.restoreAll(personID: id) }
            try await PhoneContacts.shared.removeRestoreCopies(personID: id)
        }
        invalidateAccountLoads()
        let deletionSession = sessionGeneration
        guard let account = await api.localAccountID else { throw APIError.invalidResponse }
        await messageAudio.activate(account)
        try await deleteLocalMessageLibrary()
        guard signedIn, sessionGeneration == deletionSession else { throw CancellationError() }
        await callDirectory.activate(nil, waitForReload: false)
        // Persist a status-only capability BEFORE submitting, so a lost response
        // or app termination can recover the same authorized request.
        let receipt = (UUID().uuidString + UUID().uuidString).replacingOccurrences(of: "-", with: "").lowercased()
        saveDeletionReceipt(receipt, account: account)
        try await submitDeletion(receipt)
    }
    private func submitDeletion(_ receipt: String) async throws {
        let result: DeletionRequest = try await api.send("/api/account/delete", method: "POST", body: APIClient.payload(["receipt": receipt]))
        saveDeletionReceipt(result.receipt)
        markDeletionSubmitted()
        try await clearDeletedContactChanges()
        await signOut()
    }
    private func clearDeletedContactChanges() async throws {
        // Keep recovery if deletion was rejected or never submitted. Once the
        // server accepts deletion, its write fence makes unfinished changes moot.
        if let account = UserDefaults.standard.string(forKey: deletionReceiptKey + "-account") {
            try await contactChanges.removeAccount(account)
        }
    }
    func checkAccountDeletion() async throws -> Bool {
        guard let receipt = deletionReceipt else { return false }
        do {
            let result: ReceiptStatus = try await api.send("/api/account/deletion/receipt", method: "POST",
                body: APIClient.payload(["receipt": receipt]), authenticated: false)
            markDeletionSubmitted()
            try await clearDeletedContactChanges()
            if result.state == "complete" { await signOut(); return true }
            return false
        } catch APIError.service(let code, _) where code == "deletion_receipt_unavailable" {
            // The initial request may never have reached the server. Retrying is
            // account-scoped, idempotent, and cannot delete a different login.
            guard let account = await api.localAccountID,
                  account == UserDefaults.standard.string(forKey: deletionReceiptKey + "-account") else {
                throw APIError.service(code: "deletion_receipt_unavailable", status: 404)
            }
            try await submitDeletion(receipt)
            return false
        }
    }
}

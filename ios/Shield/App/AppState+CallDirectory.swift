import Foundation

extension AppState {
    func activateCallDirectory(generation: Int) async {
        let account = await api.localAccountID
        guard generation == sessionGeneration, signedIn, !isPreview, !isDeletingAccount else { return }
        await callDirectory.activate(account, waitForReload: false)
    }

    func updateCallDirectory(_ items: [BlockedNumber], personID: UUID, generation: Int, directoryGeneration: Int) async {
        guard let account = await api.localAccountID, generation == sessionGeneration,
              signedIn, !isPreview, !isDemo, !isDeletingAccount, isOwner, selectedPersonID == personID else { return }
        let entries = items.compactMap { item -> CallDirectoryList.Entry? in
            guard let number = CallDirectoryList.digits(item.phone) else { return nil }
            return CallDirectoryList.Entry(number: number, expiresAt: item.expiresAt)
        }
        await callDirectory.update(entries: entries, account: account, participantID: personID, requestGeneration: directoryGeneration, waitForReload: false)
    }

    func removeFromCallDirectory(_ item: BlockedNumber, personID: UUID, generation: Int) async {
        guard let account = await api.localAccountID, generation == sessionGeneration,
              signedIn, !isPreview, !isDemo, !isDeletingAccount, isOwner, selectedPersonID == personID,
              let number = CallDirectoryList.digits(item.phone) else { return }
        await callDirectory.remove(number: number, account: account, participantID: personID, waitForReload: false)
    }
}

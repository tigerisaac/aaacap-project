import SwiftUI
import StoreKit

struct DeleteAccountView: View {
    @Environment(AppState.self) private var app
    @State private var status: AccountDeletionStatus?
    @State private var confirming = false
    @State private var working = false
    @State private var error: String?
    @State private var restoreContacts = true
    @State private var contactCopies: [UUID] = []
    @State private var disconnecting: AccountDeletionStatus.Phone?
    @State private var managingSubscription = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.page) {
                Text(status?.restorationRequired == true ? "First, bring back ordinary calls" : "Delete your account").shieldPageHeading()
                    .accessibilityAddTraits(.isHeader)
                if status?.subscriptionAudience == "public" || app.subscription.access?.isPublic == true {
                    Text(app.subscription.access?.hasSubscription == true
                         ? "Deleting your Shield account does not cancel your Apple subscription. You can cancel it with Apple now; you don’t need to wait for it to expire before deleting your account."
                         : "If you have an Apple subscription, deleting your Shield account does not cancel it. You can check or cancel it with Apple now; you don’t need to wait for it to expire before deleting your account.")
                    Button("Manage subscription") { managingSubscription = true }
                        .shieldSecondaryButton().disabled(app.isPreview)
                }
                if let status {
                    if status.restorationRequired {
                        Text("We’ll help you disconnect your phone before removing your account. This keeps your calls and voicemail from getting lost.").font(.title3)
                        ForEach(status.phones.filter(\.restorationRequired)) { phone in
                            Button { disconnecting = phone } label: {
                                ShieldActionLabel(title: status.phones.count == 1 ? "Restore my phone" : "Restore \(phone.name)’s phone")
                            }.shieldPrimaryButton()
                        }
                        Text("Your account will stay here until you finish the checks and confirm deletion.").foregroundStyle(ShieldTheme.secondaryText)
                    } else {
                        Text("Your Shield account, calls, saved messages and sharing permissions will be removed.").font(.title3)
                        Text("People who shared with you keep their own accounts. You’ll stop receiving their caretaker alerts.")
                        if !contactCopies.isEmpty {
                            Toggle("Put removed numbers back in Contacts", isOn: $restoreContacts)
                            Text(restoreContacts ? "We’ll restore numbers Shield removed from this iPhone’s contacts before deleting the saved restore copies." : "The removed numbers will stay out of Contacts. Their saved restore copies will be deleted too.")
                                .foregroundStyle(ShieldTheme.secondaryText)
                        }
                        Text("Deletion normally takes a few minutes and continues if you close Shield. This iPhone’s saved recordings are removed first. This cannot be undone.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        Button(role: .destructive) { confirming = true } label: {
                            Text("Delete my account").font(.headline)
                                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
                        }
                        .shieldSecondaryButton().tint(ShieldTheme.held)
                        .accessibilityIdentifier("delete-account-confirm")
                        .disabled(working)
                    }
                } else if working { ShieldLoadingView(title: "Checking your account…") }
                if let error {
                    ShieldLoadFailure(title: "Deletion hasn’t started", detail: error, symbol: "exclamationmark.circle") { Task { await load() } }
                }
                if app.isDemo { Text("This is a sample. No account will be deleted.").foregroundStyle(ShieldTheme.secondaryText) }
            }.padding(ShieldTheme.Spacing.page).frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
        }
        .background(ShieldTheme.surface)
        .navigationTitle("Delete account").navigationBarTitleDisplayMode(.inline)
        .task {
            await load()
            if !app.isPreview && !app.isDemo { await app.subscription.load(api: app.api) }
        }
        .manageSubscriptionsSheet(isPresented: $managingSubscription)
        .navigationDestination(item: $disconnecting) { phone in DisconnectView(participantID: phone.id, forDeletion: true) }
        .onChange(of: disconnecting?.id) { _, id in if id == nil { Task { await load() } } }
        .alert("Delete your account?", isPresented: $confirming) {
            Button("Delete account", role: .destructive) { Task { await remove() } }
            Button("Keep my account", role: .cancel) {}
        } message: { Text("Your account and its saved information will be removed. You’ll see confirmation here when it’s finished.") }
    }
    private func load() async {
        guard !working else { return }
        working = true; error = nil
        defer { working = false }
        if app.isDemo || app.isPreview {
            #if DEBUG && targetEnvironment(simulator)
            if ProcessInfo.processInfo.arguments.contains("--uitesting-deletion-public") {
                status = .init(restorationRequired: false, phones: [], subscriptionAudience: "public")
                return
            }
            if ProcessInfo.processInfo.arguments.contains("--uitesting-deletion-restoration") {
                let done = UserDefaults.standard.data(forKey: "shield-disconnect-fixture").flatMap { try? JSONDecoder().decode(RestorationStatus.self, from: $0) }?.completed == true
                status = .init(restorationRequired: !done, phones: [.init(id: DemoData.participant.id, name: "Your", restorationRequired: !done)])
                return
            }
            #endif
            status = .init(restorationRequired: false, phones: [])
            return
        }
        do {
            let next: AccountDeletionStatus = try await app.api.send("/api/account/deletion")
            var copies: [UUID] = []
            for phone in next.phones where try await PhoneContacts.shared.hasRestoreCopies(personID: phone.id) { copies.append(phone.id) }
            status = next; contactCopies = copies
        } catch { self.error = error.localizedDescription }
    }
    private func remove() async {
        guard !working, !app.isDemo, !app.isPreview else { return }
        working = true; error = nil
        defer { working = false }
        do { try await app.deleteAccount(contactCopies: contactCopies, restoreContacts: restoreContacts) }
        catch { self.error = error.localizedDescription }
    }
}

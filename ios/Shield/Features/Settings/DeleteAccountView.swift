import SwiftUI

struct DeleteAccountView: View {
    @Environment(AppState.self) private var model
    @State private var confirming = false
    @State private var working = false
    @State private var error: String?

    var body: some View {
        Form {
            ShieldGroup {
                Text("Delete your Shield account, calls, saved messages, and sharing permissions.")
                Text("People who shared with you keep their own accounts. Your access and trusted-contact alerts end.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
            ShieldGroup {
                Text("If your phone sends calls to Shield, disconnect it in Phone setup first. Deleting the app does not restore ordinary calls or voicemail.")
                if model.isOwner {
                    NavigationLink(value: AppRoute.setup) {
                        ActionRow(title: "Phone setup", symbol: "phone")
                    }.disabled(working)
                }
            }
            if let error {
                ShieldGroup { ShieldNotice(title: "Deletion not finished", detail: error, symbol: "exclamationmark.circle") }
            }
            ShieldGroup {
                Button(working ? "Deleting…" : "Delete my account", role: .destructive) { confirming = true }
                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                .disabled(working || model.isDeletingAccount)
                .accessibilityIdentifier("delete-account-confirm")
            } footer: {
                Text(model.isDemo ? "This is a sample. No account will be deleted." : "This cannot be undone. Recordings saved on this iPhone are removed too.")
            }
        }
        .shieldListStyle()
        .navigationTitle("Delete account")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete your account?", isPresented: $confirming) {
            Button("Delete account", role: .destructive) { Task { await remove() } }
            Button("Keep my account", role: .cancel) {}
        } message: {
            Text("Your Shield account and its information will be deleted. You’ll be signed out.")
        }
    }

    private func remove() async {
        guard !working, !model.isDemo, !model.isPreview else { return }
        working = true
        error = nil
        defer { working = false }
        do { try await model.deleteAccount() }
        catch { self.error = error.localizedDescription }
    }
}

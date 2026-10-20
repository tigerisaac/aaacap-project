import SwiftUI

struct DeletionProgressView: View {
    @Environment(AppState.self) private var app
    @State private var complete = false
    @State private var checking = false
    @State private var error: String?
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.page) {
                    Text(complete ? "Your account is deleted" : app.deletionSubmitted ? "Deleting your account" : "Sending your deletion request").shieldPageHeading().accessibilityAddTraits(.isHeader)
                    if complete {
                        Text("Your Shield account and saved account information have been removed. This iPhone’s saved messages were removed too.")
                        Text("Your carrier and iPhone settings stay as you restored them. You can now remove the Shield app.")
                        Text("Phone-provider recording deletion continues separately if needed. Minimal text-message opt-out records and temporary security records follow the privacy policy.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        Text("Other phones may still have downloaded recordings or history. Remove those local copies on each phone. Provider service and security records follow their own retention policies.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        Button { app.clearDeletionReceipt() } label: { ShieldActionLabel(title: "Done") }.shieldPrimaryButton()
                    } else {
                        Text(app.deletionSubmitted ? "You don’t need to keep this screen open. Shield will keep working on your request." : "We haven’t confirmed your request yet. Connect to the internet, then check again.").font(.title3)
                        Text(app.deletionSubmitted ? "This normally takes a few minutes. Come back here to check when it’s finished." : "Your saved messages on this iPhone have been removed. Your online account may still be there until the request reaches Shield.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        if let error {
                            ShieldNotice(title: "We couldn’t check progress", detail: error, symbol: "wifi.exclamationmark")
                            Button("Close this status screen") { Task { await app.signOut(); app.clearDeletionReceipt() } }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            Text("Closing does not cancel an accepted deletion request. Keep this screen if you want to check again.").foregroundStyle(ShieldTheme.secondaryText)
                        }
                        Button { Task { await check() } } label: { ShieldActionLabel(title: "Check progress", isWorking: checking) }
                            .shieldPrimaryButton().disabled(checking)
                    }
                }.padding(ShieldTheme.Spacing.page).frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }.background(ShieldTheme.surface).navigationTitle("Account deletion").navigationBarTitleDisplayMode(.inline)
        }
        .task {
            // On first appearance scenePhase may still be inactive. Read the
            // receipt immediately so an accepted request isn't shown as unsent.
            await check()
            while !Task.isCancelled && !complete {
                do { try await Task.sleep(for: .seconds(10)) } catch { return }
                if scenePhase == .active { await check() }
            }
        }
    }
    private func check() async {
        guard !checking, !complete else { return }
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--uitesting-deletion-progress") {
            app.deletionSubmitted = !ProcessInfo.processInfo.arguments.contains("--deletion-not-submitted")
            complete = ProcessInfo.processInfo.arguments.contains("--deletion-completed")
            return
        }
        #endif
        checking = true; error = nil
        defer { checking = false }
        do { complete = try await app.checkAccountDeletion() }
        catch { self.error = error.localizedDescription }
    }
}

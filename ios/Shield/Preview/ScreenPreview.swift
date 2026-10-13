#if DEBUG && targetEnvironment(simulator)
import SwiftUI

/// Direct access to otherwise unavailable sample forms, without reading or changing a live account.
struct ScreenPreview: View {
    let screen: String
    @Environment(AppState.self) private var model

    static var requested: String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--uitesting-screen"), arguments.indices.contains(index + 1) else { return nil }
        let screen = arguments[index + 1]
        return ["numbers", "add-number", "add-contact", "sharing", "sharing-access", "contacts", "quiet", "blocked", "setup", "setup-details", "trial-options", "protection", "invitation", "help", "automatic-texts", "audio", "alerts-on", "alerts-off", "quiet-alerts"].contains(screen) ? screen : nil
    }

    var body: some View {
        Group {
            if screen == "add-number" || screen == "add-contact" {
                AddNumberView(kind: screen == "add-contact" ? .trusted : .destinations)
            } else if screen == "invitation" {
                JoinInvitationView()
            } else {
                NavigationShell {
                    switch screen {
                    case "numbers": SavedNumbersView(kind: .destinations)
                    case "sharing", "sharing-access": SharingView()
                    case "contacts": SharedContactsView()
                    case "quiet": QuietHoursView()
                    case "blocked": BlockedNumbersView()
                    case "setup", "setup-details", "trial-options": SetupView()
                    case "protection": CallProtectionView()
                    case "help": HelpView()
                    case "automatic-texts": MessageFilterSetupView()
                    case "audio":
                        if ProcessInfo.processInfo.arguments.contains("--uitesting-detail-context-changes") {
                            NavigationLink("Open sample call") {
                                CallDetailView(initialCall: PreviewAudio.call)
                                    .task { await previewPersonChange() }
                            }
                        } else { CallDetailView(initialCall: PreviewAudio.call) }
                    case "alerts-on", "alerts-off", "quiet-alerts": MessageAlertsView()
                    default: EmptyView()
                    }
                }
            }
        }
        .demoAccessory(true)
        .task {
            if screen == "invitation", ProcessInfo.processInfo.arguments.contains("--uitesting-invitation-paste") {
                let invitation = ShieldInvitation.shareText(code: "0123456789abcdefghijklmnopqrstuv", isSample: true)
                let signature = ProcessInfo.processInfo.arguments.contains("--uitesting-invitation-signature") ? "\n\nSent from my iPhone" : ""
                UIPasteboard.general.string = invitation + signature
            }
            if screen == "audio", ProcessInfo.processInfo.arguments.contains("--uitesting-listening-access-changes") {
                await previewListeningAccessChange()
            }
        }
    }

    private func previewListeningAccessChange() async {
        guard model.isPreview, let person = model.person else { return }
        do {
            try await Task.sleep(for: .seconds(8))
            model.people = model.people.map { current in
                current.id == person.id ? Person(id: current.id, name: current.name, isOwner: current.isOwner, canListen: false) : current
            }
            try await Task.sleep(for: .seconds(4))
            model.people = model.people.map { current in current.id == person.id ? person : current }
        } catch is CancellationError { return }
        catch { return }
    }

    private func previewPersonChange() async {
        guard model.isPreview, let person = model.people.first(where: { $0.id != model.selectedPersonID }) else { return }
        do {
            try await Task.sleep(for: .seconds(8))
            model.selectedPersonID = person.id
        } catch is CancellationError { return }
        catch { return }
    }
}
#endif

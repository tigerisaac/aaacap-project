import SwiftUI

struct ForwardingRestoreView: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dismiss) private var dismiss
    @AccessibilityFocusState private var stageFocused: Bool
    @State private var leftForPhone = false
    @State private var returnedFromPhone = false
    @State private var showingHelp = false
    let status: ForwardingStatus
    let onStageChange: () -> Void
    @AppStorage private var index: Int
    @State private var codeReady = false
    @Binding private var showingPhoneLauncher: Bool
    private let codes = ["##61#", "##67#", "##62#"]

    init(status: ForwardingStatus, showingPhoneLauncher: Binding<Bool>, onStageChange: @escaping () -> Void = {}) {
        self.onStageChange = onStageChange
        _showingPhoneLauncher = showingPhoneLauncher
        self.status = status
        _index = AppStorage(wrappedValue: 0, "shield-restoration-step-" + status.participantId.uuidString)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if index < 7 {
                FlowProgress(title: index < 3 ? "Disconnect Tello" : index < 5 ? "Restore settings" : "Check ordinary service", current: index + 1, total: 7)
                Text(index < 3 ? "First, disconnect Tello forwarding. Then restore Phone settings and check ordinary calls." : "You confirmed the Tello resets. Finish the steps below to check ordinary phone service.")
                    .font(.title3).accessibilityFocused($stageFocused)
            }
            if codes.indices.contains(index) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(codes[index]).font(.title.monospaced().bold()).accessibilityIdentifier("forwarding-reset-code")
                    if codeReady {
                        Label("Copied", systemImage: "checkmark.circle.fill")
                            .font(.subheadline).foregroundStyle(ForwardingStyle.secondaryText)
                    }
                }
                PhoneCodeGuide(restoring: true, returned: returnedFromPhone)
                Button {
                    if codeReady { showingPhoneLauncher = false; index += 1; codeReady = false; returnedFromPhone = false; showingHelp = false }
                    else { copyCode() }
                } label: { ShieldActionLabel(title: codeReady ? "Tello confirmed this reset" : "Copy Tello reset code") }
                .shieldPrimaryButton()
                .accessibilityIdentifier("forwarding-reset-continue")
                if codeReady {
                    Button("Copy reset code again", systemImage: "document.on.document") { copyCode(showPhoneLauncher: false) }.frame(minHeight: 44).accessibilityIdentifier("forwarding-reset-copy")
                    Button("Show Phone again", systemImage: "phone") { copyCode() }.frame(minHeight: 44)
                    Button("Need help?", systemImage: "questionmark.circle") { showingHelp.toggle() }.frame(minHeight: 44)
                    if showingHelp {
                        Text("No banner? Open the green Phone app from Home. If Paste doesn’t appear, touch and hold above the keypad. Include every #. Stop if Tello reports an error; contact Tello if ordinary voicemail does not return.")
                            .foregroundStyle(ForwardingStyle.secondaryText)
                    }
                }
            } else if index < 5 {
                RestorationSettingsGuide(index: $index)
            } else if index < 7 {
                RestorationCallCheck(index: $index)
            } else {
                Label("Restoration checklist complete", systemImage: "checkmark.circle")
                    .font(.title2.bold()).accessibilityIdentifier("restoration-complete")
                Text("You confirmed the three Tello resets, Phone settings, an ordinary call, and normal voicemail.")
                Text("Shield callbacks remain stopped. Saved from your confirmations; Shield can’t independently read your phone or carrier settings.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
                Button { dismiss() } label: { ShieldActionLabel(title: "Done") }
                    .shieldPrimaryButton()

            }
        }
        .sensoryFeedback(.success, trigger: index) { old, new in new > old }
        .onChange(of: index) { _, _ in
            codeReady = false
            returnedFromPhone = false
            showingHelp = false
            stageFocused = true
            onStageChange()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background && codeReady { leftForPhone = true }
            if phase == .active && leftForPhone { returnedFromPhone = true; leftForPhone = false }
        }
        .task(id: index) {
            if !codeReady { copyCode() }
        }
    }

    private func copyCode(showPhoneLauncher: Bool = true) {
        guard codes.indices.contains(index) else { return }
        PhoneAppLink.copy(code: codes[index])
        codeReady = true
        if showPhoneLauncher { returnedFromPhone = false }
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        showingPhoneLauncher = showPhoneLauncher && (!args.contains("--uitesting-forwarding") || args.contains("--uitesting-system-phone"))
        #else
        showingPhoneLauncher = showPhoneLauncher
        #endif
    }
}

import SwiftUI

struct ForwardingRestoreView: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dismiss) private var dismiss
    @AccessibilityFocusState private var focusedStage: Int?
    @State private var leftForPhone = false
    @State private var returnedFromPhone = false
    @State private var showingHelp = false
    @State private var showingCopiedCode = false
    let status: ForwardingStatus
    let onStageChange: () -> Void
    @AppStorage private var index: Int
    @State private var codeReady = false
    @Binding private var showingPhoneLauncher: Bool
    private var guidedCarrier: Bool { ["Tello", "T-Mobile"].contains(status.carrier) }
    private let codes = ["##61#", "##67#", "##62#"]

    init(status: ForwardingStatus, showingPhoneLauncher: Binding<Bool>, onStageChange: @escaping () -> Void = {}) {
        self.onStageChange = onStageChange
        _showingPhoneLauncher = showingPhoneLauncher
        self.status = status
        _index = AppStorage(wrappedValue: 0, "shield-restoration-step-" + status.participantId.uuidString)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if !guidedCarrier {
                Text("Restore your saved carrier settings").shieldHeading(.title)
                Text("Ask your helper to follow the settings saved before you connected Shield. Keep Shield installed until ordinary calls and voicemail both work.")
                ForEach(status.restorationSteps, id: \.self) { Text($0) }
            } else {
                if index < 7 {
                    FlowProgress(title: index < 3 ? "Disconnect \(status.carrier)" : index < 5 ? "Restore settings" : "Check ordinary service", current: index + 1, total: 7)
                        .accessibilityFocused($focusedStage, equals: index)
                        .task(id: index) { focusedStage = index }
                    Text(index < 3 ? "Do each reset, one at a time." : "Now check Phone settings and ordinary calls.")
                        .font(.title3)
                }
                if codes.indices.contains(index) {
                    VStack(alignment: .leading, spacing: 6) {
                        ShieldDisclosure("See copied code", isExpanded: $showingCopiedCode) {
                            Text(codes[index]).font(.body.monospaced()).accessibilityIdentifier("forwarding-reset-code")
                        }
                        if codeReady {
                            Label("Copied", systemImage: "checkmark.circle.fill")
                                .font(.subheadline).foregroundStyle(ForwardingStyle.secondaryText)
                        }
                    }
                    PhoneCodeGuide(restoring: true, returned: returnedFromPhone, carrier: status.carrier)
                    Button {
                        if codeReady { showingPhoneLauncher = false; index += 1; codeReady = false; returnedFromPhone = false; showingHelp = false }
                        else { copyCode() }
                    } label: { ShieldActionLabel(title: codeReady ? "\(status.carrier) confirmed this reset" : "Copy \(status.carrier) reset code") }
                    .shieldPrimaryButton()
                    .accessibilityIdentifier("forwarding-reset-continue")
                    .id(index)
                    if codeReady {
                        Button("Copy reset code again", systemImage: "document.on.document") { copyCode(showPhoneLauncher: false) }.frame(minHeight: ShieldTheme.Layout.minimumTarget).accessibilityIdentifier("forwarding-reset-copy")
                        Button("Show Phone again", systemImage: "phone") { copyCode() }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        Button("Need help?", systemImage: "questionmark.circle") { showingHelp.toggle() }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        if showingHelp {
                            Text("Open the green Phone app if there’s no banner. Touch and hold above the keypad if Paste is missing. Stop if \(status.carrier) gives an error; ask your helper.")
                                .foregroundStyle(ForwardingStyle.secondaryText)
                        }
                    }
                } else if index < 5 {
                    RestorationSettingsGuide(index: $index)
                } else if index < 7 {
                    RestorationCallCheck(index: $index)
                } else {
                    Label("Your phone checks are done", systemImage: "checkmark.circle")
                        .shieldHeading(.title).accessibilityIdentifier("restoration-complete")
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityFocused($focusedStage, equals: index)
                        .task(id: index) { focusedStage = index }
                    Text("You’ve confirmed ordinary calls and voicemail work.")
                    Text("Shield won’t ring you. These checks are saved from what you told us.")
                        .foregroundStyle(ForwardingStyle.secondaryText)
                    Button { dismiss() } label: { ShieldActionLabel(title: "Done") }
                        .shieldPrimaryButton()

                }
            }
        }
        .id(index)
        .sensoryFeedback(.success, trigger: index) { old, new in new > old }
        .onChange(of: index) { _, _ in
            codeReady = false
            returnedFromPhone = false
            showingHelp = false
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
        guard guidedCarrier, codes.indices.contains(index) else { return }
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

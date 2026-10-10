import SwiftUI

struct ForwardingRestoreView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var leftForPhone = false
    @State private var returnedFromPhone = false
    @State private var showingHelp = false
    let status: ForwardingStatus
    @AppStorage private var index: Int
    @State private var codeReady = false
    @Binding private var showingPhoneLauncher: Bool
    private let codes = ["##61#", "##67#", "##62#"]

    init(status: ForwardingStatus, showingPhoneLauncher: Binding<Bool>) {
        _showingPhoneLauncher = showingPhoneLauncher
        self.status = status
        _index = AppStorage(wrappedValue: 0, "shield-restoration-step-" + status.participantId.uuidString)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Callbacks are stopped. Restore each connection below.").font(.title3)
            if codes.indices.contains(index) {
                Text("Restore connection \(index + 1) of 3").font(.headline)
                Text(codes[index]).font(.title.monospaced().bold()).accessibilityIdentifier("forwarding-reset-code")
                Text("Your reset code is copied").font(.headline)
                PhoneCodeGuide(restoring: true, returned: returnedFromPhone)
                Button(codeReady ? "Tello confirmed this reset" : "Copy Tello reset code") {
                    if codeReady { showingPhoneLauncher = false; index += 1; codeReady = false; returnedFromPhone = false; showingHelp = false }
                    else { copyCode() }
                }
                .buttonStyle(.borderedProminent).controlSize(.large).foregroundStyle(ShieldTheme.actionInk)
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
            } else {
                Text("Restore your original iPhone settings").font(.title2.bold())
                Text("In Settings → Apps → Phone, set Screen Unknown Callers to Never and Live Voicemail to On.")
                Text("Answer one ordinary call, then let another go to your normal voicemail. Keep Shield installed until both work.")
                Text("If normal voicemail does not return, Tello needs to restore the default voicemail routing.").foregroundStyle(ForwardingStyle.secondaryText)
            }
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

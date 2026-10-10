import SwiftUI

struct ForwardingRestoreView: View {
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
            Text("Callbacks are stopped. Now restore Tello forwarding.").font(.title3)
            if codes.indices.contains(index) {
                Text("Restore connection \(index + 1) of 3").font(.headline)
                Text(codes[index]).font(.title.monospaced().bold()).accessibilityIdentifier("forwarding-reset-code")
                Text("Your reset code is copied automatically. Tap Open beside Phone, choose Keypad, tap above the numbers, choose Paste, then tap Call. If Paste doesn’t appear, touch and hold above the numbers. Wait for Tello’s confirmation before returning here.")
                Button(codeReady ? "Tello confirmed this reset" : "Copy Tello reset code") {
                    if codeReady { showingPhoneLauncher = false; index += 1; codeReady = false }
                    else { copyCode() }
                }
                .buttonStyle(.borderedProminent).controlSize(.large).foregroundStyle(ShieldTheme.actionInk)
                .accessibilityIdentifier("forwarding-reset-continue")
                if codeReady {
                    Text("Your reset code is copied. If the banner doesn’t appear, open the green Phone app from your Home Screen. Continue only after Tello confirms the reset.")
                    Button("Copy reset code again", systemImage: "document.on.document") { copyCode(showPhoneLauncher: false) }.frame(minHeight: 44).accessibilityIdentifier("forwarding-reset-copy")
                    Button("Show Phone again", systemImage: "phone") { copyCode() }.frame(minHeight: 44)
                }
            } else {
                Text("Restore your original iPhone settings").font(.title2.bold())
                Text("In Settings → Apps → Phone, set Screen Unknown Callers to Never and Live Voicemail to On.")
                Text("Answer one ordinary call, then let another go to your normal voicemail. Keep Shield installed until both work.")
                Text("If normal voicemail does not return, Tello needs to restore the default voicemail routing.").foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .task(id: index) {
            if !codeReady { copyCode() }
        }
    }

    private func copyCode(showPhoneLauncher: Bool = true) {
        guard codes.indices.contains(index) else { return }
        PhoneAppLink.copy(code: codes[index])
        codeReady = true
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        showingPhoneLauncher = showPhoneLauncher && (!args.contains("--uitesting-forwarding") || args.contains("--uitesting-system-phone"))
        #else
        showingPhoneLauncher = showPhoneLauncher
        #endif
    }
}

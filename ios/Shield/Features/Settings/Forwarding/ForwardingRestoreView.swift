import SwiftUI

struct ForwardingRestoreView: View {
    let status: ForwardingStatus
    @AppStorage private var index: Int
    @State private var codeReady = false
    private let codes = ["##61#", "##67#", "##62#"]

    init(status: ForwardingStatus) {
        self.status = status
        _index = AppStorage(wrappedValue: 0, "shield-restoration-step-" + status.participantId.uuidString)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Callbacks are stopped. Now restore Tello forwarding.").font(.title3)
            if codes.indices.contains(index) {
                Text("Restore connection \(index + 1) of 3").font(.headline)
                Text(codes[index]).font(.title.monospaced().bold())
                Text("Copy the reset code, open Phone → Keypad, touch and hold above the numbers, choose Paste, then tap Call. Wait for Tello’s confirmation before returning here.")
                Button(codeReady ? "Tello confirmed this reset" : "Copy Tello reset code") {
                    if codeReady { index += 1; codeReady = false }
                    else { copyCode() }
                }
                .buttonStyle(.borderedProminent).controlSize(.large).foregroundStyle(ShieldTheme.actionInk)
                if codeReady {
                    Text("Your reset code is copied. Continue only after Tello confirms the reset.")
                    Button("Copy reset code again", systemImage: "document.on.document") { copyCode() }.frame(minHeight: 44)
                }
            } else {
                Text("Restore your original iPhone settings").font(.title2.bold())
                Text("In Settings → Apps → Phone, set Screen Unknown Callers to Never and Live Voicemail to On.")
                Text("Answer one ordinary call, then let another go to your normal voicemail. Keep Shield installed until both work.")
                Text("If normal voicemail does not return, Tello needs to restore the default voicemail routing.").foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
    }

    private func copyCode() {
        guard codes.indices.contains(index) else { return }
        PhoneAppLink.copy(code: codes[index])
        codeReady = true
    }
}

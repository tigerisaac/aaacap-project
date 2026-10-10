import SwiftUI

struct ForwardingRestoreView: View {
    @Environment(AppState.self) private var app
    let status: ForwardingStatus
    @AppStorage private var index: Int
    @State private var codeReady = false
    @State private var copied = false
    @State private var showingCodeCard = false
    @State private var demoActionBlocked = false
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
                Text("Open the reset code, then tap it on the card. Wait for Tello’s confirmation before returning here.")
                Button(codeReady ? "Tello confirmed this reset" : "Open Tello reset code") {
                    if codeReady { index += 1; codeReady = false; copied = false; demoActionBlocked = false }
                    else { openCodeCard() }
                }
                .buttonStyle(.borderedProminent).controlSize(.large).foregroundStyle(ShieldTheme.actionInk)
                if codeReady {
                    Button("Open reset code again", systemImage: "phone") { openCodeCard() }.frame(minHeight: 44)
                }
                DisclosureGroup("Paste in Phone instead") {
                    Text("Copy the code, open Phone → Keypad, touch and hold above the numbers, choose Paste, then tap the green call button. Wait for Tello’s confirmation.")
                        .padding(.top, 8)
                    Button(copied ? "Copied · copy again" : "Copy reset code", systemImage: "document.on.document") {
                        PhoneAppLink.copy(code: codes[index]); copied = true; codeReady = true
                    }.frame(minHeight: 44)
                }
                if demoActionBlocked { Text("Demo: no carrier request was made.").foregroundStyle(ForwardingStyle.secondaryText) }
            } else {
                Text("Restore your original iPhone settings").font(.title2.bold())
                Text("In Settings → Apps → Phone, set Screen Unknown Callers to Never and Live Voicemail to On.")
                Text("Answer one ordinary call, then let another go to your normal voicemail. Keep Shield installed until both work.")
                Text("If normal voicemail does not return, Tello needs to restore the default voicemail routing.").foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .sheet(isPresented: $showingCodeCard) {
            if codes.indices.contains(index) {
                ForwardingDialCard(code: codes[index], title: "Restore connection \(index + 1)", blocksDialing: app.isDemo,
                    onClose: { showingCodeCard = false }, onBlockedAction: { demoActionBlocked = true })
            }
        }
    }

    private func openCodeCard() {
        guard codes.indices.contains(index) else { return }
        PhoneAppLink.copy(code: codes[index])
        codeReady = true
        copied = false
        showingCodeCard = true
    }
}

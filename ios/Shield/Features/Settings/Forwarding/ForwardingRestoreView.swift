import SwiftUI

struct ForwardingRestoreView: View {
    let status: ForwardingStatus
    @AppStorage("shield-pilot-restoration-step") private var index = 0
    @State private var copied = false
    @State private var openingPhone = false
    @State private var phoneError: String?
    private let codes = ["##61#", "##67#", "##62#"]
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Callbacks are stopped. Now restore Tello forwarding.").font(.title3)
            if index < codes.count {
                Text("Restore connection \(index + 1) of 3").font(.headline)
                Text(codes[index]).font(.title.monospaced().bold())
                Text("Paste this code into Phone → Keypad, tap the green call button, and wait for Tello’s confirmation.")
                Button(copied ? "Tello confirmed this reset" : "Copy code and open Phone") {
                    if copied { index += 1; copied = false; phoneError = nil }
                    else { Task { await copyAndOpenPhone() } }
                }
                .buttonStyle(.borderedProminent).controlSize(.large).foregroundStyle(ShieldTheme.actionInk)
                .disabled(openingPhone)
                if copied {
                    Button("Copy code and reopen Phone", systemImage: "phone") {
                        Task { await copyAndOpenPhone() }
                    }.frame(minHeight: 44).disabled(openingPhone)
                }
                if let phoneError { Text(phoneError).foregroundStyle(ForwardingStyle.secondaryText) }
            } else {
                Text("Restore your original iPhone settings").font(.title2.bold())
                Text("In Settings → Apps → Phone, set Screen Unknown Callers to Never and Live Voicemail to On.")
                Text("Answer one ordinary call, then let another go to your normal voicemail. Keep Shield installed until both work.")
                Text("If normal voicemail does not return, Tello needs to restore the default voicemail routing.").foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
    }
    private func copyAndOpenPhone() async {
        guard codes.indices.contains(index), !openingPhone else { return }
        openingPhone = true
        defer { openingPhone = false }
        copied = true
        phoneError = nil
        if !(await PhoneAppLink.copyAndOpen(code: codes[index])) {
            phoneError = "Your code is copied. Open the green Phone app, then choose Keypad to paste it."
        }
    }
}

import SwiftUI

struct ForwardingCodeView: View {
    @Bindable var model: ForwardingSetupModel

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Tello connection \((model.step.codeIndex ?? 0) + 1) of 3").foregroundStyle(ForwardingStyle.secondaryText)
            if let code = model.code {
                if model.codePreparedStep == model.step {
                    Text("Your code is copied").font(.title2.bold())
                        .accessibilityIdentifier("forwarding-code-copied")
                } else {
                    Text("Your personal Tello code").font(.title2.bold())
                }
                Text(code).font(.title3.monospaced().bold()).textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("forwarding-code")
                if model.codePreparedStep == model.step {
                    SetupInstruction(number: 1, title: "Open Phone → Keypad", detail: "Go to your Home Screen and open the green Phone app. Choose Keypad.")
                    SetupInstruction(number: 2, title: "Hold above the numbers and paste", detail: "Touch and hold the blank area above the keypad, then choose Paste. Check that every star and the final # are included.")
                    SetupInstruction(number: 3, title: "Tap Call and wait for Tello", detail: "Continue here only after Tello says Setting Registration Succeeded for Voice Call Forwarding.")
                    Button("Copy code again", systemImage: "document.on.document") { model.copyCode() }
                        .frame(minHeight: 44).disabled(model.working)
                        .accessibilityIdentifier("forwarding-copy-code")
                } else {
                    Text("Copy the code below, then paste it into Phone’s keypad. Shield saves your place while you switch apps.")
                }
                Button("The code didn’t work", systemImage: "questionmark.circle") { model.showingHelp.toggle() }
                    .frame(minHeight: 44)
                if model.showingHelp {
                    Text("Check your mobile signal and include every star and the final #. If Tello reports an error again, stop here. You can restore your phone from Setup options above.")
                        .foregroundStyle(ForwardingStyle.secondaryText)
                }
            } else {
                Text("The call-test window has ended.").font(.title2.bold())
                Text("Restart the test to show your code. Your earlier progress is saved. Existing forwarding stays in place until you restore it.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

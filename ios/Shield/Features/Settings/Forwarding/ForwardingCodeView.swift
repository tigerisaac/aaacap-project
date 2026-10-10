import SwiftUI

struct ForwardingCodeView: View {
    @Bindable var model: ForwardingSetupModel
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Tello connection \((model.step.codeIndex ?? 0) + 1) of 3").foregroundStyle(ForwardingStyle.secondaryText)
            if let code = model.code {
                Text(model.copiedStep == model.step ? "Your code is copied" : "Your personal Tello code")
                    .font(.title2.bold())
                Text(code).font(.title3.monospaced().bold()).textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("forwarding-code")
                if model.copiedStep == model.step {
                    SetupInstruction(number: 1, title: "In Phone, choose Keypad", detail: "Touch and hold the space above the numbers, then tap Paste.")
                    SetupInstruction(number: 2, title: "Tap the green call button", detail: "Wait for Tello’s confirmation. Choose the confirmation button below only if it succeeded.")
                    Button("Copy code and reopen Phone", systemImage: "phone") {
                        Task { await model.copyCodeAndOpenPhone() }
                    }
                    .frame(minHeight: 44)
                    .disabled(model.working)
                    .accessibilityIdentifier("forwarding-phone-reopen")
                } else {
                    Text("The button below copies your code and opens Phone. Choose Keypad, then touch and hold above the numbers to paste it.")
                    Text("iPhone requires forwarding codes to be entered in Phone. Shield saves your place throughout setup.")
                        .foregroundStyle(ForwardingStyle.secondaryText)
                }
                Button("The code didn’t work", systemImage: "questionmark.circle") { model.showingHelp.toggle() }
                    .frame(minHeight: 44)
                if model.showingHelp {
                    Text("Check your mobile signal, then paste the complete code including both stars and the #. If Tello reports an error again, stop here. You can restore your phone from Setup options above.")
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

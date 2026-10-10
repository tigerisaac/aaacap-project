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
                    PhoneCodeGuide(returned: model.codeReturnedStep == model.step)
                    Button("Copy code again", systemImage: "document.on.document") { model.copyCode(showPhoneLauncher: false) }
                        .frame(minHeight: 44).disabled(model.working)
                        .accessibilityIdentifier("forwarding-copy-code")
                } else {
                    Text("Copy the code below, then tap Open on the Phone banner. Paste it into Phone’s keypad. Shield saves your place while you switch apps.")
                }
                if model.codePreparedStep == model.step {
                    Button("Show Phone again", systemImage: "phone") { model.copyCode() }
                        .frame(minHeight: 44).disabled(model.working)
                        .accessibilityIdentifier("forwarding-phone-reopen")
                }
                Button("Need help?", systemImage: "questionmark.circle") { model.showingHelp.toggle() }
                    .frame(minHeight: 44)
                if model.showingHelp {
                    Text("No banner? Open the green Phone app from your Home Screen. If Paste doesn’t appear, touch and hold above the keypad. Include every star and the final #. If Tello reports an error again, stop here and use Restore my phone in Setup options.")
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

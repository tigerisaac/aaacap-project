import SwiftUI

struct ForwardingCodeView: View {
    @Bindable var model: ForwardingSetupModel

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if let code = model.code {
                if model.codePreparedStep == model.step {
                    Label("Code copied", systemImage: "checkmark.circle.fill").font(.headline)
                        .accessibilityIdentifier("forwarding-code-copied")
                } else {
                    Text("Your personal \(model.carrier) code").shieldHeading(.title)
                }
                if model.codePreparedStep == model.step {
                    PhoneCodeGuide(returned: model.codeReturnedStep == model.step, carrier: model.carrier)
                    Button("Copy code again", systemImage: "document.on.document") { model.copyCode(showPhoneLauncher: false) }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
                        .accessibilityIdentifier("forwarding-copy-code")
                } else {
                    Text("Copy your code, then open Phone and paste it into Keypad.")
                }
                if model.codePreparedStep == model.step {
                    Button("Show Phone again", systemImage: "phone") { model.copyCode() }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
                        .accessibilityIdentifier("forwarding-phone-reopen")
                }
                DisclosureGroup("See copied code") {
                    Text(code).font(.body.monospaced()).textSelection(.enabled)
                        .fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("forwarding-code")
                }
                Button("Need help?", systemImage: "questionmark.circle") { model.showingHelp.toggle() }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                if model.showingHelp {
                    Text("Open the green Phone app if there’s no banner. If Paste is missing, touch and hold above the keypad. If \(model.carrier) gives an error, stop and ask your helper.")
                        .foregroundStyle(ForwardingStyle.secondaryText)
                }
            } else {
                Text("The call test ended.").shieldHeading(.title)
                Text("Start the test again to get your code. Your place is saved. Your phone is still connected to Shield.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

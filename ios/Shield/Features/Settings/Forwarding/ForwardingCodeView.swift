import SwiftUI

struct ForwardingCodeView: View {
    @Bindable var model: ForwardingSetupModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let code = model.code {
                if model.codePreparedStep == model.step {
                    Label("Code copied", systemImage: "checkmark.circle.fill").font(.headline)
                        .accessibilityIdentifier("forwarding-code-copied")
                } else {
                    Text("Your personal \(model.carrier) code").shieldHeading(.title)
                }
                if model.codePreparedStep == model.step {
                    SetupGuideView(guide: .keypad, player: model.guidePlayer)
                    PhoneCodeGuide(returned: model.codeReturnedStep == model.step, carrier: model.carrier)
                } else {
                    Text("Copy your code, then open Phone and paste it into Keypad.")
                }
                VStack(alignment: .leading, spacing: 0) {
                    ShieldDisclosure("See copied code") {
                        Text(code).font(.body.monospaced()).textSelection(.enabled)
                            .fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("forwarding-code")
                    }
                    ShieldDisclosure("Need help?", isExpanded: $model.showingHelp) {
                        Button("Copy code again", systemImage: "document.on.document") { model.copyCode(showPhoneLauncher: false) }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
                            .accessibilityIdentifier("forwarding-copy-code")
                        Button("Show Phone again", systemImage: "phone") { model.copyCode() }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
                            .accessibilityIdentifier("forwarding-phone-reopen")
                        Text("No banner? Open the green Phone app. No Paste? Touch and hold above the keypad. If \(model.carrier) gives an error, stop and contact support.")
                            .foregroundStyle(ForwardingStyle.secondaryText)
                    }
                }
            } else {
                Text("Get a fresh carrier code.").font(.title2)
                Text("Your place is saved.").foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

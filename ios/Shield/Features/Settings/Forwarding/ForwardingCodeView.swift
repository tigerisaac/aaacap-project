import SwiftUI

struct ForwardingCodeView: View {
    @Bindable var model: ForwardingSetupModel

    private var copied: Bool { model.codePreparedStep == model.step }
    private var returned: Bool { model.codeReturnedStep == model.step }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let code = model.code {
                if let sequence = model.codeSequence {
                    Text(sequence).font(.headline).accessibilityIdentifier("forwarding-code-sequence")
                }
                if returned {
                    PhoneCodeGuide(returned: true, carrier: model.carrier, showingHeading: false)
                    helpAction("Open Phone again") { Task { await model.openCarrierPhone() } }
                        .accessibilityIdentifier("forwarding-phone-reopen")
                } else {
                    Text("This tells \(model.carrier) to send calls you miss to Shield for checking.")
                    if copied {
                        Label("Ready to paste in Phone", systemImage: "checkmark.circle.fill")
                            .font(.headline).accessibilityIdentifier("forwarding-code-copied")
                        Text(model.phoneNeedsBanner ? "Tap Open on the Phone banner. Then tap Keypad if needed." : "In Phone, tap Keypad if needed.")
                            .accessibilityIdentifier("forwarding-phone-navigation")
                    } else {
                        Text("Copy your setup code first. You won’t need to type it.")
                    }
                    SetupGuideView(guide: .keypad, player: model.guidePlayer)
                }
                VStack(alignment: .leading, spacing: 0) {
                    ShieldDisclosure(returned ? "Watch the guide again" : "Read the steps") {
                        if returned { SetupGuideView(guide: .keypad, player: model.guidePlayer) }
                        else { PhoneCodeGuide(carrier: model.carrier) }
                    }
                    ShieldDisclosure("See setup code") {
                        Text(code).font(.body.monospaced()).textSelection(.enabled)
                            .fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("forwarding-code")
                    }
                    ShieldDisclosure("Need help?", isExpanded: $model.showingHelp) {
                        if copied && !returned {
                            helpAction("Open Phone again") { Task { await model.openCarrierPhone() } }
                                .accessibilityIdentifier("forwarding-phone-reopen")
                        }
                        helpAction(copied ? "Copy code again" : "Copy setup code") { model.copyCode() }
                            .accessibilityIdentifier("forwarding-copy-code")
                        Text("If Phone opens elsewhere, tap Keypad. No Paste? Touch and hold above the numbers. If \(model.carrier) gives an error, stop and contact support.")
                            .foregroundStyle(ForwardingStyle.secondaryText)
                    }
                }
            } else {
                Text("Get a fresh carrier code.").font(.title2)
                Text("Your place is saved.").foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .sensoryFeedback(.success, trigger: copied) { _, new in new }
    }

    private func helpAction(_ title: String, action: @escaping @MainActor () -> Void) -> some View {
        Button(action: action) {
            Text(title).frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                .contentShape(.rect)
        }
        .buttonStyle(.plain).foregroundStyle(ShieldTheme.action).disabled(model.working)
    }
}

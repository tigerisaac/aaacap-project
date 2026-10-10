import SwiftUI

struct ForwardingCodeView: View {
    @Environment(AppState.self) private var app
    @Bindable var model: ForwardingSetupModel

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Tello connection \((model.step.codeIndex ?? 0) + 1) of 3").foregroundStyle(ForwardingStyle.secondaryText)
            if let code = model.code {
                Text(model.codePreparedStep == model.step ? "Your code is ready" : "Your personal Tello code")
                    .font(.title2.bold())
                Text(code).font(.title3.monospaced().bold()).textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("forwarding-code")
                if model.codePreparedStep == model.step {
                    SetupInstruction(number: 1, title: "Tap the code on the card", detail: "The phone icon asks Tello to apply this connection. Wait for Tello’s confirmation, then return to Shield.")
                    SetupInstruction(number: 2, title: "Confirm only if Tello succeeded", detail: "Opening the card does not change forwarding. Continue below only after Tello confirms it.")
                    Button("Open Tello code again", systemImage: "phone") { model.openCodeCard() }
                        .frame(minHeight: 44).disabled(model.working)
                        .accessibilityIdentifier("forwarding-phone-reopen")
                } else {
                    Text("Open the code card below, then tap the code beside the phone icon. Return to Shield after Tello confirms the change.")
                    Text("You stay in control. Shield saves your place throughout setup.")
                        .foregroundStyle(ForwardingStyle.secondaryText)
                }
                DisclosureGroup("Paste in Phone instead") {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Copy the complete code, open the green Phone app, and choose Keypad. Touch and hold above the numbers, choose Paste, then tap the green call button.")
                        Button(model.codeCopied ? "Copied · copy again" : "Copy code", systemImage: "document.on.document") { model.copyCode() }
                            .frame(minHeight: 44).accessibilityIdentifier("forwarding-copy-code")
                        if model.codeCopied { Text("Your code is copied").accessibilityIdentifier("forwarding-code-copied") }
                        Text("Return using the Shield link at the top left of Phone. Wait for Tello’s confirmation before continuing.")
                    }.padding(.top, 8)
                }
                Button("The code didn’t work", systemImage: "questionmark.circle") { model.showingHelp.toggle() }
                    .frame(minHeight: 44)
                if model.showingHelp {
                    Text("If the card cannot dial the code, use Paste in Phone instead. Check your mobile signal and include every star and the final #. If Tello reports an error again, stop here. You can restore your phone from Setup options above.")
                        .foregroundStyle(ForwardingStyle.secondaryText)
                }
            } else {
                Text("The call-test window has ended.").font(.title2.bold())
                Text("Restart the test to show your code. Your earlier progress is saved. Existing forwarding stays in place until you restore it.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .sheet(isPresented: $model.showingCodeCard) {
            if let code = model.code {
                ForwardingDialCard(code: code, title: model.step.title, blocksDialing: model.isUITest || app.isDemo,
                    onClose: { model.showingCodeCard = false }, onBlockedAction: { model.blockedCodeCardAction() })
            }
        }
    }
}

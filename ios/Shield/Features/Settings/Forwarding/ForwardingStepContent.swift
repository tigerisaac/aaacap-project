import SwiftUI

struct ForwardingStepContent: View {
    let step: ForwardingStep
    let status: ForwardingStatus
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            switch step {
            case .overview:
                Text("A quieter phone, one step at a time.").font(.title3)
                Text("Shield asks unknown callers why they’re calling. You decide which screened calls to answer.")
                Label("Your progress is saved", systemImage: "bookmark").foregroundStyle(ForwardingStyle.secondaryText)
                Text("We’ll save Shield as a contact, connect Tello, and check the calls together.").foregroundStyle(ForwardingStyle.secondaryText)
                Text("Tello · one phone line · data plan confirmed").font(.subheadline).foregroundStyle(ForwardingStyle.secondaryText)
            case .consent:
                Text("A screened call is always your choice.").font(.title3)
                SetupInstruction(number: 1, title: "Callers introduce themselves", detail: status.liveScreening == true ? "OpenAI’s live AI assistant asks why the caller is calling. It can end suspicious or silent calls. This does not prove who is calling." : "\(status.voiceProvider ?? "Your phone provider") transcribes their introduction. OpenRouter and Google Gemini help screen it. This does not prove who is calling.")
                SetupInstruction(number: 2, title: "Messages go to Shield", detail: "Forwarded callers can leave a one-minute message. Messages and history expire after 30 days. Connected conversations are not recorded, and are transcribed only if you turn on connected-call protection.")
                SetupInstruction(number: 3, title: "Start a short call test", detail: "You can start a 30-minute test here. Any caller may reach screening during it, up to 10 calls. Tello minutes and phone-service usage apply.")
                Text("Ending the test or deleting Shield does not undo forwarding. Restore your phone here when you finish.").foregroundStyle(ForwardingStyle.secondaryText)
                Link("Privacy details", destination: URL(string: "https://shield-calls-isaac.web.app/privacy")!).frame(minHeight: 44)
            case .save:
                Image(systemName: "person.crop.circle.badge.checkmark").font(.system(size: 52))
                    .foregroundStyle(ShieldTheme.action).accessibilityHidden(true)
                Text("Save one contact so screened calls can ring through.").font(.title3)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Shield · Screened call").font(.headline)
                    Text(status.shieldNumber).foregroundStyle(ForwardingStyle.secondaryText)
                }
                Text("Tap Save below, then allow Contacts access if iPhone asks. Shield will take you to the sound check.").foregroundStyle(ForwardingStyle.secondaryText)
            case .checks:
                ForwardingTestView(status: status)
            case .restore:
                ForwardingRestoreView(status: status)
            default: EmptyView()
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

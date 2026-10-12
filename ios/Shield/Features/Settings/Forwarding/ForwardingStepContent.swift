import SwiftUI

struct ForwardingStepContent: View {
    let step: ForwardingStep
    let status: ForwardingStatus
    @Bindable var model: ForwardingSetupModel
    var onRestorationStageChange: () -> Void = {}
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            switch step {
            case .overview:
                Text("Shield asks unfamiliar callers why they’re calling. You choose whether to answer.").font(.title3)
                Text("We’ll save Shield, change two Phone settings, and check a call.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
                Label("Your place is saved", systemImage: "bookmark").foregroundStyle(ForwardingStyle.secondaryText)
            case .consent:
                SetupInstruction(number: 1, title: "You choose whether to answer", detail: status.liveScreening == true
                    ? "Shield checks unfamiliar calls. Press 1 to take a call. Shield can’t prove who is calling."
                    : "Call checks are off. Callers can leave voicemail instead.")
                SetupInstruction(number: 2, title: "Voicemail comes to Shield", detail: "Messages and call history are deleted after 30 days.")
                SetupInstruction(number: 3, title: "Try it for 30 minutes", detail: "Up to 10 calls can be checked. Your usual \(status.carrier) charges apply.")
                Text("To leave Shield, use Disconnect Shield in Setup options. Deleting the app won’t disconnect it.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
                DisclosureGroup("More before you agree") {
                    Text("The caller’s speech goes to OpenAI’s call assistant. Any caller may reach the test while it is on. Shield may stop suspicious or silent calls and can make mistakes.")
                    Text("Voicemail is limited to one minute. Calls you take aren’t recorded. Their words are checked only if you choose checks while you talk.")
                    Link("Privacy details", destination: URL(string: "https://shield-calls-isaac.web.app/privacy")!)
                }
            case .save:
                Text("Save Shield so the calls it sends you can ring.").font(.title3)
                Label("Shield · Screened call", systemImage: "person.crop.circle.badge.plus").font(.headline)
                Text("Allow Contacts if your iPhone asks.").foregroundStyle(ForwardingStyle.secondaryText)
            case .checks:
                ForwardingTestView(status: status)
            case .restore:
                ForwardingRestoreView(status: status, showingPhoneLauncher: $model.showingPhoneLauncher, onStageChange: onRestorationStageChange)
            default: EmptyView()
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

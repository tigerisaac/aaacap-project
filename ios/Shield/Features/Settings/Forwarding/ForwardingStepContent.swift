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
                VStack(alignment: .leading, spacing: 8) {
                    Text("You choose whether to answer").font(.headline)
                    Text(status.liveScreening == true
                    ? "Shield checks unfamiliar calls. Press 1 to take a call. Shield can’t prove who is calling."
                    : "Call checks are off. Callers can leave voicemail instead.")
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Messages come to Shield").font(.headline)
                    Text("Shield saves messages with audio and a short summary. Messages and call history are deleted after 30 days.")
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Try it for 30 minutes").font(.headline)
                    Text("Up to 10 calls can be checked. Your usual \(status.carrier) charges apply.")
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("To leave Shield, use Disconnect Shield in Setup options.")
                    Text("Deleting the app won’t disconnect it.")
                }.foregroundStyle(ForwardingStyle.secondaryText)
                DisclosureGroup("More before you agree") {
                    Text("Telnyx provides the phone service. OpenAI checks the caller’s speech. Shield may stop suspicious or silent calls and can make mistakes.")
                    Text("Messages may be captured from the start of the call. Answered calls and clear scam messages aren’t saved. Full transcripts aren’t kept.")
                    Text("Calls you take aren’t recorded. Their words are checked only if you choose checks while you talk.")
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

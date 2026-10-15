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
                VStack(alignment: .leading, spacing: 20) {
                    ForEach(["Save Shield", "Check that it can ring you", "Change settings", "Connect your carrier"], id: \.self) { item in
                        HStack(spacing: 14) {
                            Circle().fill(ShieldTheme.action).frame(width: 6, height: 6).accessibilityHidden(true)
                            Text(item).font(.title3)
                        }
                    }
                }
            case .consent:
                Text("You choose whether to answer").font(.headline)
                Text("Messages come to Shield").font(.headline)
                Text("To leave, choose Options → Disconnect Shield.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
                ShieldDisclosure("More before you agree") {
                    Text(status.liveScreening == true
                         ? "Shield checks unfamiliar calls. Press 1 to take a call. Shield can’t prove who is calling."
                         : "Call checks are off. Callers can leave voicemail instead.")
                    Text("Shield saves messages with audio and a short summary. Messages and call history are deleted after 30 days.")
                    Text("Telnyx provides the phone service. OpenAI checks the caller’s speech. Shield may stop suspicious or silent calls and can make mistakes.")
                    Text("Messages may be captured from the start of the call. Answered calls and clear scam messages aren’t saved. Full transcripts aren’t kept.")
                    Text("Calls you take aren’t recorded. Their words are checked only if you choose checks while you talk.")
                    Text("Your usual \(status.carrier) charges apply. Deleting the app won’t disconnect Shield.")
                    Link("Privacy details", destination: URL(string: "https://shield-calls-isaac.web.app/privacy")!)
                }
            case .save:
                HStack(spacing: 16) {
                    Image("ShieldMark").resizable().scaledToFit().frame(width: 56, height: 56)
                        .clipShape(.rect(cornerRadius: 56 * ShieldTheme.Layout.iconCornerRatio, style: .continuous))
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Shield").font(.title2.bold())
                        Text("Screened calls").foregroundStyle(ForwardingStyle.secondaryText)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20).background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
                Text("Allow Contacts if asked.").foregroundStyle(ForwardingStyle.secondaryText)
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

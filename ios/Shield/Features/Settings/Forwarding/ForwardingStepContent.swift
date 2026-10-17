import SwiftUI

struct ForwardingStepContent: View {
    let step: ForwardingStep
    let status: ForwardingStatus
    @Bindable var model: ForwardingSetupModel
    var onRestorationStageChange: () -> Void = {}
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            switch step {
            case .overview:
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                    point("Save Shield", symbol: "person.crop.circle.badge.plus")
                    point("Check that it can ring you", symbol: "phone.badge.waveform")
                    point("Change settings", symbol: "gearshape")
                    point("Connect your carrier", symbol: "antenna.radiowaves.left.and.right")
                }
            case .consent:
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                    point("You choose whether to answer", symbol: "hand.tap")
                    point("Messages come to Shield", symbol: "recordingtape")
                }
                Text("To leave, choose Options → Disconnect Shield.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
                Text(PrivacyCopy.screeningProviders)
                Text(PrivacyCopy.screeningConsent)
                ShieldDisclosure("More before you agree") {
                    Text(status.liveScreening == true
                         ? "Shield checks unfamiliar calls. Press 1 to take a call. Shield can’t prove who is calling."
                         : "Call checks are off. Callers can leave voicemail instead.")
                    Text(PrivacyCopy.messageRetention)
                    Text("Shield may stop suspicious or silent calls and can make mistakes.")
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

    /// A short setup point led by the shared row symbol tile, so the list reads like the rest of Shield.
    private func point(_ title: String, symbol: String) -> some View {
        HStack(spacing: ShieldTheme.Layout.rowSymbolSpacing) {
            if !typeSize.isAccessibilitySize { ShieldRowSymbol(systemName: symbol) }
            Text(title).font(.title3.weight(.medium)).foregroundStyle(ShieldTheme.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

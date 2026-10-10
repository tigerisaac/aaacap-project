import SwiftUI

struct ForwardingPhoneSettingsView: View {
    @Bindable var model: ForwardingSetupModel
    private var silence: Bool { model.step == .settings }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(silence ? "Let Shield handle unknown calls." : "Let Tello send unanswered calls to Shield.").font(.title3)
            VStack(alignment: .leading, spacing: 12) {
                Text(silence ? "Screen Unknown Callers" : "Live Voicemail").font(.headline)
                Label(silence ? "Choose Silence" : "Turn Off", systemImage: "hand.tap")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.action)
            }
            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
            .background(ShieldTheme.card, in: .rect(cornerRadius: 16))

            if model.settingsReturned {
                Text("Your place is saved").font(.headline)
                Text("iPhone doesn’t share this setting with Shield. Confirm your choice below; we’ll check forwarding with a real call after connecting Tello.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
                    .accessibilityIdentifier("phone-settings-unverified")
                Button("Open Phone settings again", systemImage: "gearshape") {
                    Task { await model.openPhoneSettings() }
                }.frame(minHeight: 44).accessibilityIdentifier("phone-settings-reopen")
            } else {
                Text(model.settingsDestination.directions).foregroundStyle(ForwardingStyle.secondaryText)
                Text("Use the Shield link at the top left of Settings to continue. Your place will be saved.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
            }
            if !silence {
                Text("Keep voicemail enabled in your Tello account. Only turn off Live Voicemail on this iPhone.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
            }
            DisclosureGroup("Settings opened somewhere else?") {
                Text("Open Settings → Apps → Phone. Then find \(silence ? "Screen Unknown Callers and choose Silence" : "Live Voicemail and turn it off").")
                    .padding(.top, 8).foregroundStyle(ForwardingStyle.secondaryText)
                if !model.settingsReturned {
                    Button("I’ve already changed this setting") { model.acknowledgeManualSettingsVisit() }
                        .frame(minHeight: 44)
                }
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

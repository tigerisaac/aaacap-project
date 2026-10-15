import SwiftUI

struct ForwardingPhoneSettingsView: View {
    @Bindable var model: ForwardingSetupModel
    private var silence: Bool { model.step == .settings }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(silence ? "Choose Silence." : "Turn it off.").font(.title2)
                .accessibilityIdentifier("phone-setting-instruction")
            SetupGuideView(guide: silence ? .silence : .voicemailOff, player: model.guidePlayer)
            Text(model.settingsDestination.directions)
                .font(.callout).foregroundStyle(ForwardingStyle.secondaryText)
            if model.settingsReturned {
                Button("Open Phone settings again", systemImage: "gearshape") { Task { await model.openPhoneSettings() } }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget).accessibilityIdentifier("phone-settings-reopen")
            }
            ShieldDisclosure("Can’t find it?") {
                Text("Open Settings, then Apps, then Phone. Find \(silence ? "Screen Unknown Callers and choose Silence" : "Live Voicemail and turn it off").")
                if !model.settingsReturned {
                    Button("I already changed it") { model.acknowledgeManualSettingsVisit() }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                }
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

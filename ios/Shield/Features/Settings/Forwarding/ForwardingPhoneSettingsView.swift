import SwiftUI

struct ForwardingPhoneSettingsView: View {
    @Bindable var model: ForwardingSetupModel
    private var silence: Bool { model.step == .settings }
    private var manualRoute: Bool { model.settingsDestination == .shield || model.settingsDestination == .unavailable }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(manualRoute ? model.settingsDestination.directions : silence
                 ? "In Settings, slide your finger down to Screen Unknown Callers. Then tap Silence."
                 : "In Settings, slide your finger down to Live Voicemail, just above Screen Unknown Callers. Leave its switch gray (off).")
                .accessibilityIdentifier("phone-settings-navigation")
            if model.settingsDestination == .callIdentification {
                Text("If Call Blocking & Identification opens, tap the back arrow to Phone first.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
            }
            SetupGuideView(guide: silence ? .silence : .voicemailOff, player: model.guidePlayer, animateNavigation: !manualRoute)
            ShieldDisclosure("Read the steps") {
                Text((silence ? SetupGuide.silence : .voicemailOff).instructions)
                if model.settingsReturned {
                    Button("Open Phone settings again", systemImage: "gearshape") { Task { await model.openPhoneSettings() } }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).accessibilityIdentifier("phone-settings-reopen")
                }
                if !model.settingsReturned {
                    Button("I already changed it") { model.acknowledgeManualSettingsVisit() }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                }
                Text("If you see Location or Notifications at the top of Phone settings, slide your finger up instead. Stop at the section named above.")
                Text("A small reminder comes with you automatically. If it covers a setting, drag it to another corner.")
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

import SwiftUI

struct ForwardingPhoneSettingsView: View {
    @Bindable var model: ForwardingSetupModel
    private var silence: Bool { model.step == .settings }
    private var guide: SetupGuide { silence ? .silence : .voicemailOff }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(model.settingsDestination.directions)
                .accessibilityIdentifier("phone-settings-navigation")
            Text("Stop at \(guide.settingHeading).")
                .accessibilityIdentifier("phone-settings-target")
            SetupGuideView(guide: guide, player: model.guidePlayer)
            ShieldDisclosure("Read the steps") {
                Text("Keep sliding up past Incoming Calls and Announce Calls. Live Voicemail comes before Screen Unknown Callers. Stop when you see the heading shown in the guide.")
                Text(guide.instructions)
                if model.settingsReturned {
                    Button("Open Phone settings again", systemImage: "gearshape") { Task { await model.openPhoneSettings() } }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).accessibilityIdentifier("phone-settings-reopen")
                }
                if !model.settingsReturned {
                    Button("I already changed it") { model.acknowledgeManualSettingsVisit() }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                }
                Text("Went too far? Call Filtering is just below Screen Unknown Callers. Slide your finger down a little to come back to it.")
                Text("If a different page opens, return to Shield, then open Settings → Apps → Phone.")
                Text("A small reminder comes with you automatically. If it covers a setting, drag it to another corner.")
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

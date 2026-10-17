import SwiftUI

struct ManualPhoneSettingsGuide: View {
    @Bindable var model: ForwardingSetupModel
    private var combined: Bool { model.step == .settings }
    private var guide: SetupGuide { combined ? .phoneSettings : .voicemailOff }

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
            Text(model.settingsReturned && model.settingsDestination != .unavailable
                 ? (combined ? "Check that Silence has a checkmark. You’ll confirm Live Voicemail next." : "Confirm that Live Voicemail is gray (off).")
                 : model.settingsDestination.directions)
                .accessibilityIdentifier("phone-settings-navigation")
            if !model.settingsReturned || model.settingsDestination == .unavailable {
                Text("Stop at \(guide.settingHeading).")
                    .accessibilityIdentifier("phone-settings-target")
                if combined {
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                        Text("1. Live Voicemail: off")
                        Text("2. Screen Unknown Callers: Silence")
                    }
                    .accessibilityIdentifier("phone-settings-two-changes")
                }
            }
            SetupGuideView(guide: guide, player: model.guidePlayer, showingResult: model.settingsReturned)
            if model.settingsReturned {
                Button("Open Phone settings again", systemImage: "gearshape") { Task { await model.openPhoneSettings() } }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget).accessibilityIdentifier("phone-settings-reopen")
            }
            ShieldDisclosure("Read the steps") {
                Text("Keep sliding up past Incoming Calls and Announce Calls. Live Voicemail comes before Screen Unknown Callers. Stop when you see the heading shown in the guide.")
                Text(guide.instructions)
                if !model.settingsReturned {
                    Button(combined ? "I already changed both" : "It’s already off") { model.acknowledgeManualSettingsVisit() }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                }
                Text("Went too far? Call Filtering is just below Screen Unknown Callers. Slide your finger down a little to come back to it.")
                Text("If a different page opens, return to Shield, then open Settings → Apps → Phone.")
                Text("When available, a small reminder comes with you automatically. If it covers a setting, drag it to another corner.")
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

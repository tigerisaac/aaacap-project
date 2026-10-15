import SwiftUI

struct ForwardingPhoneSettingsView: View {
    @Bindable var model: ForwardingSetupModel
    private var silence: Bool { model.step == .settings }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if model.settingsDestination != .phone {
                Text(model.settingsDestination.directions)
                    .foregroundStyle(ForwardingStyle.secondaryText)
            }
            SetupGuideView(guide: silence ? .silence : .voicemailOff, player: model.guidePlayer)
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
                Text("You can drag the floating video out of the way, or pinch it to make it larger.")
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

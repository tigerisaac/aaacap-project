import SwiftUI

struct ForwardingPhoneSettingsView: View {
    @Bindable var model: ForwardingSetupModel
    private var silence: Bool { model.step == .settings }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            SetupInstruction(number: 1, title: silence ? "Screen Unknown Callers" : "Live Voicemail", detail: silence ? "Choose Silence." : "Turn it off.")
            if silence {
                SetupInstruction(number: 2, title: "Live Voicemail", detail: "Turn it off in the same visit.")
            }
            Text("Keep voicemail on in your \(model.carrier) account.").foregroundStyle(ForwardingStyle.secondaryText)
            if model.settingsReturned {
                Text(silence ? "Did you choose Silence?" : "Is Live Voicemail off?").font(.headline)
                    .accessibilityIdentifier("phone-settings-unverified")
                Text("Confirm below. Shield can’t see this setting.").foregroundStyle(ForwardingStyle.secondaryText)
                Button("Open Phone settings again", systemImage: "gearshape") { Task { await model.openPhoneSettings() } }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget).accessibilityIdentifier("phone-settings-reopen")
            } else {
                Text(model.settingsDestination.directions).foregroundStyle(ForwardingStyle.secondaryText)
                Text("When done, return to Shield.").foregroundStyle(ForwardingStyle.secondaryText)
            }
            DisclosureGroup("Can’t find it?") {
                Text("Open Settings, then Apps, then Phone. Find \(silence ? "Screen Unknown Callers and choose Silence" : "Live Voicemail and turn it off").")
                if !model.settingsReturned {
                    Button("I already changed it") { model.acknowledgeManualSettingsVisit() }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                }
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

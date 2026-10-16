import SwiftUI

struct RestorationSettingsGuide: View {
    @Binding var index: Int
    @Environment(\.scenePhase) private var scenePhase
    @State private var opened = false
    @State private var leftSettings = false
    @State private var returned = false
    @State private var working = false
    @State private var destination = PhoneSettingsLink.preferredDestination
    @State private var guidePlayer = SetupGuidePlayer()
    private var unknownCallers: Bool { index == 3 }
    private var guide: SetupGuide { unknownCallers ? .never : .voicemailOn }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(unknownCallers ? "Let ordinary calls ring" : "Restore iPhone voicemail")
                .shieldHeading(.title).accessibilityAddTraits(.isHeader)
            Text(destination.directions)
            Text("Stop at \(guide.settingHeading).")
            Button(opened ? "Open Phone settings again" : "Open Phone settings", systemImage: "gearshape") {
                Task { await openSettings() }
            }
            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(working).accessibilityIdentifier("restoration-settings-open")
            SetupGuideView(guide: guide, player: guidePlayer)
            if returned {
                Text("Did you make the change? Confirm below. Shield can’t see this setting.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
                    .accessibilityIdentifier("restoration-settings-unverified")
            }
            ShieldDisclosure("Read the steps") {
                Text("Already changed it? You can confirm below. Shield can’t see this setting.")
                Text(destination.directions)
                Text(guide.instructions)
                Text("If a different page opens, return to Shield, then open Settings → Apps → Phone. When done, return to Shield.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .onChange(of: scenePhase) { _, phase in
            if phase == .background && opened { leftSettings = true }
            if phase == .active && leftSettings {
                guidePlayer.returnedToShield()
                returned = true; leftSettings = false
            }
        }
        .onDisappear { guidePlayer.stop() }
    }

    private func openSettings() async {
        working = true
        defer { working = false }
        opened = true
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") && !ProcessInfo.processInfo.arguments.contains("--uitesting-system-settings") {
            returned = true
            return
        }
        #endif
        await guidePlayer.startFloating()
        destination = await PhoneSettingsLink.open()
        if destination == .unavailable { guidePlayer.returnedToShield() }
    }
}

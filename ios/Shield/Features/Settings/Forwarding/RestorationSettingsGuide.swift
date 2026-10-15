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

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(unknownCallers ? "Let ordinary calls ring" : "Restore iPhone voicemail")
                .shieldHeading(.title).accessibilityAddTraits(.isHeader)
            if destination != .phone {
                Text(destination.directions).foregroundStyle(ForwardingStyle.secondaryText)
            }
            SetupGuideView(guide: unknownCallers ? .never : .voicemailOn, player: guidePlayer)
            Text(returned ? "Did you make the change? Confirm below. Shield can’t see this setting." : "Already done? Confirm below.")
                .foregroundStyle(ForwardingStyle.secondaryText)
                .accessibilityIdentifier("restoration-settings-unverified")
            Button(opened ? "Open Phone settings again" : "Open Phone settings", systemImage: "gearshape") {
                Task { await openSettings() }
            }
            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(working).accessibilityIdentifier("restoration-settings-open")
            ShieldDisclosure("Read the steps") {
                Text((unknownCallers ? SetupGuide.never : .voicemailOn).instructions)
                Text("Open Settings, then Apps, then Phone. When done, return to Shield.")
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
        if ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") && !ProcessInfo.processInfo.arguments.contains("--uitesting-system-phone") {
            returned = true
            return
        }
        #endif
        await guidePlayer.startFloating()
        destination = await PhoneSettingsLink.open()
    }
}

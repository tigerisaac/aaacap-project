import SwiftUI

struct RestorationSettingsGuide: View {
    @Binding var index: Int
    @Environment(\.scenePhase) private var scenePhase
    @State private var opened = false
    @State private var leftSettings = false
    @State private var returned = false
    @State private var working = false
    @State private var destination = PhoneSettingsLink.preferredDestination
    private var unknownCallers: Bool { index == 3 }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Phone settings · \(unknownCallers ? 1 : 2) of 2").foregroundStyle(ForwardingStyle.secondaryText)
            Text(unknownCallers ? "Let ordinary calls ring" : "Restore iPhone voicemail")
                .font(.title2.bold()).accessibilityAddTraits(.isHeader)
            VStack(alignment: .leading, spacing: 12) {
                Text(unknownCallers ? "Screen Unknown Callers" : "Live Voicemail").font(.headline)
                Label(unknownCallers ? "Choose Never" : "Turn On", systemImage: "hand.tap")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.action)
                if unknownCallers {
                    Text("Turn Live Voicemail on too. We’ll check that next.")
                }
            }
            .shieldCard()
            Text(returned ? "Did you make the change? Confirm below. Shield can’t see this setting." : "Already done? Confirm below.")
                .foregroundStyle(ForwardingStyle.secondaryText)
                .accessibilityIdentifier("restoration-settings-unverified")
            Button(opened ? "Open Phone settings again" : "Open Phone settings", systemImage: "gearshape") {
                Task { await openSettings() }
            }
            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(working).accessibilityIdentifier("restoration-settings-open")
            DisclosureGroup("Can’t find it?") {
                Text(destination.directions)
                Text("Open Settings, then Apps, then Phone. When done, return to Shield.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .onChange(of: scenePhase) { _, phase in
            if phase == .background && opened { leftSettings = true }
            if phase == .active && leftSettings { returned = true; leftSettings = false }
        }
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
        destination = await PhoneSettingsLink.open()
    }
}

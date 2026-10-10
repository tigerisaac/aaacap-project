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
    private var confirmation: String { unknownCallers ? "Screen Unknown Callers is Never" : "Live Voicemail is on" }

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
                    Text("During the same visit, turn Live Voicemail on. We’ll confirm it next.")
                }
            }
            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
            .background(ShieldTheme.card, in: .rect(cornerRadius: 16))
            Text(returned ? "Back from Settings? Confirm the value below. Shield can’t read this setting." : "Already done? Confirm the value below to continue without opening Settings again.")
                .foregroundStyle(ForwardingStyle.secondaryText)
                .accessibilityIdentifier("restoration-settings-unverified")
            Button { index += 1 } label: {
                Text(confirmation).font(.headline).multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, minHeight: 38)
            }
                .buttonStyle(.borderedProminent).controlSize(.large)
                .buttonBorderShape(.roundedRectangle(radius: 16))
                .foregroundStyle(ShieldTheme.actionInk)
                .accessibilityIdentifier("restoration-settings-confirm")
            Button(opened ? "Open Phone settings again" : "Open Phone settings", systemImage: "gearshape") {
                Task { await openSettings() }
            }
            .frame(minHeight: 44).disabled(working).accessibilityIdentifier("restoration-settings-open")
            Text(destination.directions)
                .foregroundStyle(ForwardingStyle.secondaryText)
            Text("If a different page opens, go to Settings → Apps → Phone. Use the Shield link at the top left to return here.")
                .foregroundStyle(ForwardingStyle.secondaryText)
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

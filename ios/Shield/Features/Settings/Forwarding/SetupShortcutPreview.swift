#if DEBUG
import SwiftUI

/// An isolated trial. It cannot advance backend setup or change forwarding.
struct SetupShortcutPreview: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var session = SetupShortcutSession()
    @State private var player = SetupGuidePlayer(automaticFloating: false)
    @State private var importRequest: UUID?
    @State private var leftShield = false
    @AccessibilityFocusState private var errorFocused: Bool

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text(heading).shieldPageHeading()
                    instructions
                    if session.phase != .confirmed {
                        SetupGuideView(guide: .shortcutVoicemail, player: player,
                                       showingResult: session.phase == .returned)
                        Text("Off means the switch is gray and its white circle is on the left.")
                    }
                    if let error = session.error {
                        Text(error)
                            .accessibilityIdentifier("setup-shortcut-error")
                            .accessibilityFocused($errorFocused)
                            .id("shortcut-error")
                    }
                    if typeSize.isAccessibilitySize { primaryAction }
                    if session.phase == .add {
                        Button("I already added it") { session.phase = .ready }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .accessibilityIdentifier("setup-shortcut-already-added")
                    }
                    if session.phase == .returned {
                        Button("Open Phone settings again") { Task { await session.run(using: player) } }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .disabled(session.opening)
                            .accessibilityIdentifier("setup-shortcut-reopen")
                    }
                    ShieldDisclosure("Need help?") {
                        Text("The helper is named Shield Easy Setup. If Settings didn’t open, add it again, then try once more.")
                        Button("Add the helper again") { importRequest = UUID() }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .accessibilityIdentifier("setup-shortcut-add-again")
                        NavigationLink("Use the step-by-step guide") { ForwardingSetupView() }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24)
            }
            .onChange(of: session.error) { _, error in
                guard error != nil else { return }
                proxy.scrollTo("shortcut-error", anchor: .center)
                errorFocused = true
            }
        }
        .background(ShieldTheme.surface)
        .shieldNavigationSurface()
        .navigationTitle("Phone setup trial")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            if !typeSize.isAccessibilitySize {
                primaryAction.padding(24).background(ShieldTheme.surface)
            }
        }
        .background {
            SetupShortcutImportAnchor(request: importRequest, onHandoff: {
                importRequest = nil
                session.importHandedOff()
            }, onUnavailable: {
                importRequest = nil
                session.error = "The helper couldn’t open. Use the step-by-step guide under Need help."
            })
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background {
                leftShield = true
                if !session.isLeavingForSettings { player.returnedToShield() }
            }
            if phase == .active && leftShield {
                leftShield = false
                player.returnedToShield()
            }
            session.sceneChanged(isActive: phase == .active, isBackground: phase == .background)
        }
        .onChange(of: session.phase) { _, phase in
            if phase == .confirmed { player.stop() }
        }
        .onDisappear { player.stop() }
    }

    private var heading: String {
        switch session.phase {
        case .add: "Let iPhone lend a hand"
        case .ready: "One switch to check"
        case .returned: "Is Live Voicemail off?"
        case .confirmed: "That’s the phone change"
        }
    }

    @ViewBuilder private var instructions: some View {
        switch session.phase {
        case .add:
            Text("An iPhone shortcut will silence unfamiliar callers and take you to Live Voicemail.")
            Text("Choose Shortcuts, then Add Shortcut. Tap ‹ Shield to come back here. You only add it once.")
        case .ready:
            Text("After adding the helper, tap below. Your iPhone will silence unfamiliar callers and open Phone settings beside Live Voicemail.")
            Text("Leave Live Voicemail off. A small reminder comes with you.")
        case .returned:
            Text("If its switch is gray, leave it off. Confirm only after you’ve seen it in Settings.")
            Text("Returning here doesn’t check the setting for you.")
        case .confirmed:
            Text("You confirmed that Live Voicemail is off. In the full setup, the test call comes next.")
            Text("This trial hasn’t changed your carrier forwarding.")
        }
    }

    private var primaryAction: some View {
        Button {
            switch session.phase {
            case .add: importRequest = UUID()
            case .ready: Task { await session.run(using: player) }
            case .returned: session.phase = .confirmed
            case .confirmed: session.phase = .ready
            }
        } label: {
            ShieldActionLabel(title: primaryTitle, isWorking: session.opening)
        }
        .shieldPrimaryButton()
        .disabled(session.opening)
        .accessibilityIdentifier("setup-shortcut-primary")
    }

    private var primaryTitle: String {
        switch session.phase {
        case .add: "Add setup helper"
        case .ready: session.reminderUnavailable ? "Open Settings anyway" : "Open Phone settings"
        case .returned: "Live Voicemail is off"
        case .confirmed: "Try it again"
        }
    }
}
#endif

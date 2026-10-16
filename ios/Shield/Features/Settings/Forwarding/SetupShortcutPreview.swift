#if DEBUG
import SwiftUI

/// Evaluate the native import and explicit run before considering normal setup.
struct SetupShortcutPreview: View {
    @State private var session = SetupShortcutSession()
    @State private var importRequest: UUID?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(session.outcome == .finished ? "The iPhone action finished" : "Silence unfamiliar calls")
                    .shieldPageHeading()
                if session.outcome == .finished {
                    Text("Shortcuts reported that its action finished. This preview hasn’t read your Phone settings.")
                        .accessibilityIdentifier("setup-shortcut-result")
                } else if session.readyToRun {
                    Text("After adding the shortcut, tap the button below. Your iPhone will turn Silence Unknown Callers on and bring you back here.")
                } else {
                    Text("Your iPhone can make this change for you, without searching through Settings.")
                    Text("Choose Shortcuts, then Add Shortcut. Tap ‹ Shield to come back here. Adding it does not run it.")
                }
                Text("This action turns Silence Unknown Callers on. Calls from unsaved numbers may go to voicemail.")
                    .foregroundStyle(ShieldTheme.secondaryText)
                if session.outcome == .cancelled || session.outcome == .failed {
                    Text(session.outcome == .cancelled
                         ? "The action was cancelled. Nothing is confirmed."
                         : "The action didn’t finish. If you haven’t added it yet, add it below, then try again.")
                        .accessibilityIdentifier("setup-shortcut-result")
                }
                if let error = session.error { Text(error) }
                if session.readyToRun {
                    Button("Add the shortcut again") { importRequest = UUID() }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        .accessibilityIdentifier("setup-shortcut-add-again")
                        .background(importAnchor)
                } else {
                    Button("I already added it") { session.readyToRun = true }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        .accessibilityIdentifier("setup-shortcut-already-added")
                }
                Text("Preview only. Live Voicemail and carrier forwarding are not changed.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
        .background(ShieldTheme.surface)
        .safeAreaInset(edge: .bottom) {
            Button {
                if session.readyToRun { Task { await session.run() } }
                else { importRequest = UUID() }
            } label: {
                ShieldActionLabel(title: session.readyToRun ? "Turn on call silencing" : "Add iPhone action", isWorking: session.opening)
            }
            .shieldPrimaryButton()
            .disabled(session.opening)
            .accessibilityIdentifier(session.readyToRun ? "setup-shortcut-run" : "setup-shortcut-add")
            .background { if !session.readyToRun { importAnchor } }
            .padding(24)
            .background(ShieldTheme.surface)
        }
        .onOpenURL { session.receive($0) }
    }

    private var importAnchor: some View {
        SetupShortcutImportAnchor(request: importRequest,
                                  onHandoff: {
                                      importRequest = nil
                                      session.readyToRun = true
                                  },
                                  onUnavailable: {
                                      importRequest = nil
                                      session.error = "Shortcuts is unavailable. You can still use Phone settings."
                                  })
    }
}
#endif

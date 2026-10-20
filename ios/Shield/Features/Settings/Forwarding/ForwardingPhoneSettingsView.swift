import SwiftUI

struct ForwardingPhoneSettingsView: View {
    @Bindable var model: ForwardingSetupModel
    @State private var importRequest: UUID?

    var body: some View {
        if model.usingManualPhoneSettings {
            ManualPhoneSettingsGuide(model: model)
        } else {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                if model.addingPhoneHelper {
                    Text("Add Shield’s helper once. It selects Silence for you.")
                    Text("On the next screen, tap **Add Shortcut**. Then tap **Shield** at the top left to come back.")
                        .accessibilityIdentifier("phone-helper-install-directions")
                    helpAction("I already added it") { model.acknowledgePhoneHelper() }
                        .accessibilityIdentifier("phone-helper-already-added")
                } else {
                    Text(model.settingsReturned
                         ? (model.step == .settings ? "Check that Silence has a checkmark." : "Check that Live Voicemail is gray (off).")
                         : "Your iPhone selects Silence for you. Turn Live Voicemail off, then return to Shield.")
                        .accessibilityIdentifier("phone-settings-navigation")
                    SetupGuideView(guide: model.settingsReturned && model.step == .settings ? .silence : .shortcutVoicemail,
                                   player: model.shortcutGuidePlayer, showingResult: model.settingsReturned)
                    if model.settingsReturned {
                        helpAction("Open Phone settings again") { Task { await model.openPhoneSettings() } }
                            .accessibilityIdentifier("phone-settings-reopen")
                    }
                }
                ShieldDisclosure("Need help?") {
                    Text("If the switch is already gray, leave it off. To return, tap the floating guide, then its Return to App button.")
                    helpAction("Add the helper again") { Task { await model.installPhoneHelper() } }
                    helpAction("Open the saved helper file") { importRequest = UUID() }
                        .accessibilityIdentifier("phone-helper-saved-file")
                    helpAction("Use the step-by-step guide") { model.useManualPhoneSettings() }
                        .accessibilityIdentifier("phone-helper-manual-guide")
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .background {
                SetupShortcutImportAnchor(request: importRequest, onHandoff: {
                    importRequest = nil
                    model.acknowledgePhoneHelper()
                }, onUnavailable: {
                    importRequest = nil
                    model.reportError("The helper couldn’t open. Use the step-by-step guide under Need help.")
                })
            }
        }
    }

    private func helpAction(_ title: String, action: @escaping @MainActor () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .foregroundStyle(ShieldTheme.action)
    }

}

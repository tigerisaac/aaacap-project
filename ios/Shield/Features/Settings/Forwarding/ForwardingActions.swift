import SwiftUI

struct ForwardingActions: View {
    @Bindable var model: ForwardingSetupModel
    let app: AppState
    /// In the scrolling content (accessibility sizes) the page already supplies the margins.
    var inline = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 4) {
            if model.step != .restore {
                Button {
                    if model.step == .checks { dismiss(); Task { await app.refresh() } }
                    else { Task { await model.primaryAction(app) } }
                } label: {
                    ShieldActionLabel(title: label, isWorking: model.working || model.probeWaiting && (model.step == .ring || model.step == .test))
                }
                .shieldPrimaryButton()
                .disabled(model.working || ((model.step == .ring || model.step == .test) && model.probeWaiting)
                    || (model.step == .save && model.status?.prepared != true))
                .accessibilityIdentifier("forwarding-continue")
            } else if let status = model.status {
                RestorationConfirmationAction(status: status)
            }

        }
        .tint(ShieldTheme.action)
        // Pinned, the button's edges line up with the page's text column.
        .padding(.horizontal, inline ? 0 : ShieldTheme.Spacing.page)
        .padding(.top, inline ? 0 : 12).padding(.bottom, inline ? 0 : 8)
        .background(ShieldTheme.surface)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("forwarding-action-area")
    }
    private var label: String {
        if model.step.codeIndex != nil {
            if model.code == nil { return "Get my code" }
            return model.codePreparedStep == model.step ? "\(model.carrier) confirmed the change" : "Copy \(model.carrier) code"
        }
        if model.isPhoneSettingsStep && !model.settingsReturned { return model.settingsReminderUnavailable ? "Open Settings anyway" : "Open Phone settings" }
        switch model.step {
        case .overview: return "Set up my phone"
        case .consent: return "Agree and continue"
        case .save: return "Save contact"
        case .settings: return "I selected Silence"
        case .liveVoicemail: return "Live Voicemail is off"
        case .ring, .test:
            if model.probePassed { return "Continue" }
            if model.probeWaiting { return "Waiting for your call…" }
            if model.probe != nil { return "Try the call again" }
            return model.step == .ring ? "Call me now" : "Check my calls"
        case .checks: return "Done"
        default: return "Continue"
        }
    }
}

/// Explicit confirmations stay visible while the restoration instructions scroll.
private struct RestorationConfirmationAction: View {
    @AppStorage private var index: Int
    init(status: ForwardingStatus) {
        _index = AppStorage(wrappedValue: 0, "shield-restoration-step-" + status.participantId.uuidString)
    }
    var body: some View {
        if (3..<7).contains(index) {
            Button { index += 1 } label: { ShieldActionLabel(title: title) }
                .shieldPrimaryButton()
                .accessibilityIdentifier(index < 5 ? "restoration-settings-confirm" : "restoration-call-confirm")
                .id(index)
        }
    }
    private var title: String {
        switch index {
        case 3: "I selected Never"
        case 4: "Live Voicemail is on"
        case 5: "I answered an ordinary call"
        default: "My normal voicemail works"
        }
    }
}

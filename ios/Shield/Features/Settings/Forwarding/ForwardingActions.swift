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
                    if model.step == .checks, model.status?.publicEnrollment == true, model.status?.alwaysOn != true {
                        Task { await model.startPublicProtection(app) }
                    } else if model.step == .checks { dismiss(); Task { await app.refresh() } }
                    else { Task { await model.primaryAction(app) } }
                } label: {
                    ShieldActionLabel(title: label, isWorking: model.working || model.probeWaiting && (model.step == .ring || model.step == .test))
                }
                .shieldPrimaryButton()
                .disabled(model.working || ((model.step == .ring || model.step == .test) && model.probeWaiting)
                    || (model.step == .save && model.status?.prepared != true))
                .accessibilityIdentifier("forwarding-continue")
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
            if model.codePreparedStep != model.step { return "Copy setup code" }
            if model.codeReturnedStep != model.step { return "Open Phone" }
            return "\(model.carrier) confirmed the change"
        }
        if model.isPhoneSettingsStep && !model.usingManualPhoneSettings { return model.phoneSettingsAction }
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
        case .checks: return model.status?.publicEnrollment == true && model.status?.alwaysOn != true ? "Start protection" : "Done"
        default: return "Continue"
        }
    }
}

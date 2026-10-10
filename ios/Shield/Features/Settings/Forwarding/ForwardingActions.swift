import SwiftUI

struct ForwardingActions: View {
    @Bindable var model: ForwardingSetupModel
    let app: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 4) {
            if model.step != .restore {
                Button {
                    if model.step == .checks { dismiss() }
                    else { Task { await model.primaryAction(app) } }
                } label: {
                    HStack(spacing: 12) {
                        if model.working || model.probeWaiting && (model.step == .ring || model.step == .test) {
                            ProgressView().tint(ShieldTheme.actionInk)
                        }
                        Text(label).font(.headline).multilineTextAlignment(.center)
                    }
                    .foregroundStyle(ShieldTheme.actionInk)
                    .frame(maxWidth: .infinity, minHeight: 38)
                }
                .buttonStyle(.borderedProminent).controlSize(.large)
                .buttonBorderShape(.roundedRectangle(radius: 16))
                .disabled(model.working || ((model.step == .ring || model.step == .test) && model.probeWaiting)
                    || (model.step == .save && model.status?.prepared != true))
                .accessibilityIdentifier("forwarding-continue")
            }

        }
        .tint(ShieldTheme.action)
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .background(ShieldTheme.surface)
    }
    private var label: String {
        if model.step.codeIndex != nil {
            if model.code == nil { return "Restart call test" }
            return model.codePreparedStep == model.step ? "Tello confirmed the change" : "Copy Tello code"
        }
        if model.isPhoneSettingsStep && !model.settingsReturned { return "Open Phone settings" }
        switch model.step {
        case .overview: return "Set up my phone"
        case .consent: return "Agree and continue"
        case .save: return "Save Shield to Contacts"
        case .settings: return "I selected Silence"
        case .liveVoicemail: return "Live Voicemail is off"
        case .ring, .test:
            if model.probePassed { return "Continue" }
            if model.probeWaiting { return "Checking automatically…" }
            if model.probe != nil { return "Try the call again" }
            return model.step == .ring ? "Call me now" : "Check forwarding now"
        case .checks: return "Done"
        default: return "Continue"
        }
    }
}

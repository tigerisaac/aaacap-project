import SwiftUI
import UserNotifications

struct ContactAlertChoiceView: View {
    @Environment(AppState.self) private var model
    let request: ContactAlertRequest
    let textAvailable: Bool
    let appAvailable: Bool
    let onSaved: (Bool, Bool, Bool) async -> Void
    @State private var textAlerts: Bool
    @State private var appAlerts: Bool
    @State private var working = false
    @State private var error: String?
    @State private var notificationsDenied = false
    init(request: ContactAlertRequest, textAvailable: Bool, appAvailable: Bool, onSaved: @escaping (Bool, Bool, Bool) async -> Void) {
        self.request = request; self.textAvailable = textAvailable; self.appAvailable = appAvailable; self.onSaved = onSaved
        _textAlerts = State(initialValue: request.textAlerts && textAvailable)
        _appAlerts = State(initialValue: request.appAlerts && appAvailable)
    }
    var body: some View {
        ShieldSection(request.name) {
            VStack(alignment: .leading, spacing: 4) {
                Text(request.status == "accepted" ? "You’re a caretaker." : "Receive protection alerts?").font(.headline)
                if request.ownerPaused { Text("\(request.name) has paused these alerts.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText) }
            }.padding(.vertical, ShieldTheme.Spacing.tight)
            Toggle("Text messages", isOn: $textAlerts).disabled(working || !textAvailable).accessibilityIdentifier("contact-text-alerts")
            Toggle("App notifications", isOn: $appAlerts).disabled(working || !appAvailable).accessibilityIdentifier("contact-app-alerts")
            ShieldDisclosure("About alerts") {
                Text("Shield alerts you only when checks while they talk detect a possible scam request and intervene. Alerts include their name. Calls, messages, and recordings stay private. Message frequency varies; message and data rates may apply.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
        } footer: {
            if textAlerts { Text("Rates may apply. Reply STOP to stop texts.") }
        }
        if notificationsDenied || error != nil {
            ShieldGroup {
                if let error { ShieldNotice(title: "Alert choices not saved", detail: error, symbol: "exclamationmark.circle").accessibilityIdentifier("contact-alert-error") }
                if notificationsDenied, let url = URL(string: UIApplication.openSettingsURLString) { Link("Open notification settings", destination: url).frame(minHeight: ShieldTheme.Layout.minimumTarget) }
            }
        }
        Section {
            VStack(spacing: ShieldTheme.Spacing.compact) {
                Button { Task { await save(accept: true) } } label: {
                    ShieldActionLabel(title: request.status == "accepted" ? "Save alert choices" : "Accept request", isWorking: working)
                }
                .shieldPrimaryButton().disabled(working || (!textAlerts && !appAlerts)).accessibilityIdentifier("contact-accept")
                Button(role: .destructive) { Task { await save(accept: false) } } label: {
                    Text(request.status == "accepted" ? "Stop these alerts" : "Decline request").font(.headline)
                        .foregroundStyle(ShieldTheme.held)
                        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                        .contentShape(.rect)
                }
                .disabled(working)
            }
            .buttonStyle(.borderless)
            .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
        }
    }
    private func save(accept: Bool) async {
        guard !working else { return }
        let generation = model.sessionGeneration
        working = true; error = nil; notificationsDenied = false
        defer { working = false }
        do {
            if accept && appAlerts && !model.isPreview {
                let allowed = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
                guard allowed else {
                    notificationsDenied = true
                    error = "Allow Shield notifications in Settings, or turn off App notifications and choose texts. Your alert choices haven’t been saved."
                    return
                }
            }
            if !model.isPreview {
                guard generation == model.sessionGeneration, model.signedIn else { return }
                let _: APIResponses.Empty = try await model.api.send("/api/contact-alerts/\(request.id.uuidString.lowercased())", method: "POST",
                    body: APIClient.payload(["accept": accept, "textAlerts": accept && textAlerts, "appAlerts": accept && appAlerts]))
                // A recipient without their own protected phone may register only
                // after the server has accepted their caretaker relationship.
                if accept && appAlerts { UIApplication.shared.registerForRemoteNotifications() }
            }
            guard generation == model.sessionGeneration else { return }
            await onSaved(accept, accept && textAlerts, accept && appAlerts)
        } catch is CancellationError { return }
        catch { self.error = error.localizedDescription; model.handleSessionFailure(error) }
    }
}

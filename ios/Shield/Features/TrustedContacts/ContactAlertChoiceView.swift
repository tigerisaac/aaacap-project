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
            Text(request.status == "accepted" ? "You’re a trusted contact." : "Receive protection alerts?").font(.headline)
            if request.ownerPaused { Text("\(request.name) has paused these alerts.").foregroundStyle(ShieldTheme.secondaryText) }
            Toggle("Text messages", isOn: $textAlerts).disabled(working || !textAvailable).accessibilityIdentifier("contact-text-alerts")
            Toggle("App notifications", isOn: $appAlerts).disabled(working || !appAvailable).accessibilityIdentifier("contact-app-alerts")
            if textAlerts { Text("Rates may apply. Reply STOP to stop texts.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText) }
            if notificationsDenied, let url = URL(string: UIApplication.openSettingsURLString) { Link("Open notification settings", destination: url).frame(minHeight: 44) }
            if let error { Text(error).foregroundStyle(ShieldTheme.secondaryText).accessibilityIdentifier("contact-alert-error") }
            Button(request.status == "accepted" ? "Save alert choices" : "Accept request") { Task { await save(accept: true) } }
                .frame(minHeight: 44).disabled(working || (!textAlerts && !appAlerts)).accessibilityIdentifier("contact-accept")
            Button(request.status == "accepted" ? "Stop these alerts" : "Decline request", role: .destructive) { Task { await save(accept: false) } }
                .frame(minHeight: 44).disabled(working)
            ShieldDisclosure("About alerts") {
                Text("Shield sends brief protection updates with their name. Calls, messages, and recordings stay private. Message frequency varies; message and data rates may apply.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
        }
    }
    private func save(accept: Bool) async {
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
                UIApplication.shared.registerForRemoteNotifications()
            }
            if !model.isPreview {
                let _: APIResponses.Empty = try await model.api.send("/api/contact-alerts/\(request.id.uuidString.lowercased())", method: "POST",
                    body: APIClient.payload(["accept": accept, "textAlerts": accept && textAlerts, "appAlerts": accept && appAlerts]))
            }
            await onSaved(accept, accept && textAlerts, accept && appAlerts)
        } catch { self.error = error.localizedDescription }
    }
}

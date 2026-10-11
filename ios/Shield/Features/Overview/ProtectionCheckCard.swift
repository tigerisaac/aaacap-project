import Contacts
import SwiftUI
import UIKit
import UserNotifications

/// What the app can check about the person's setup each time it opens. Settings only a real call can prove
/// (Silence Unknown Callers, Live Voicemail, carrier forwarding) are not claimed here.
struct ProtectionCheckItem: Identifiable, Equatable, Sendable {
    enum Fix: Equatable, Sendable { case setup, saveShieldContact(String), allowNotifications, sharedContacts, contactsAccess(String) }
    let id: String
    let title: String
    let detail: String
    let fix: Fix
}

enum ProtectionCheck {
    /// Shared contacts older than this may miss someone she's added since.
    static let staleContacts: TimeInterval = 30 * 86400

    @MainActor
    static func run(status: String, forwarding: ForwardingStatus?, notificationsAvailable: Bool) async -> [ProtectionCheckItem] {
        var items: [ProtectionCheckItem] = []
        if status == "paused" {
            items.append(.init(id: "paused", title: "Protection is paused", detail: "Unknown callers go to voicemail without being screened.", fix: .setup))
        } else if status == "restoring" {
            items.append(.init(id: "restoring", title: "Shield is being turned off", detail: "Finish restoring your phone settings, or set Shield up again.", fix: .setup))
        }
        if let number = forwarding?.shieldNumber {
            switch CNContactStore.authorizationStatus(for: .contacts) {
            case .authorized, .limited:
                if !hasContact(number) {
                    items.append(.init(id: "contact", title: "Shield’s number isn’t in your Contacts",
                        detail: "Calls Shield offers you may go to voicemail instead of ringing.", fix: .saveShieldContact(number)))
                }
            default:
                items.append(.init(id: "contacts-access", title: "Shield can’t check your Contacts",
                    detail: "Shield’s number needs to be saved so the calls it offers ring.", fix: .contactsAccess(number)))
            }
        }
        if notificationsAvailable {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            if settings.authorizationStatus != .authorized && settings.authorizationStatus != .provisional {
                items.append(.init(id: "notifications", title: "Notifications are off", detail: "You won’t hear about new messages or setup problems.", fix: .allowNotifications))
            }
        }
        // Only a real call can prove Silence, Live Voicemail and carrier forwarding; the daily check is that call.
        if let check = forwarding?.lastSetupCheck, check.result != "passed", Date.now.timeIntervalSince(check.at) < 3 * 86400 {
            items.append(check.result == "not_forwarded"
                ? .init(id: "setup-check", title: "Calls aren’t reaching Shield", detail: "Shield’s daily check call didn’t come through. Check call forwarding with your carrier, and keep Live Voicemail off.", fix: .setup)
                : .init(id: "setup-check", title: "Unknown callers are ringing your phone", detail: "Shield’s daily check call rang your phone. Turn Silence Unknown Callers back on in Phone settings.", fix: .setup))
        }
        if let synced = forwarding?.contactsSyncedAt, Date.now.timeIntervalSince(synced) > staleContacts {
            items.append(.init(id: "contacts-sync", title: "Shared contacts are over a month old",
                detail: "Someone you’ve added since may be screened like a stranger.", fix: .sharedContacts))
        }
        return items
    }

    private static func hasContact(_ number: String) -> Bool {
        let predicate = CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: number))
        return ((try? CNContactStore().unifiedContacts(matching: predicate, keysToFetch: [CNContactIdentifierKey as CNKeyDescriptor])) ?? []).isEmpty == false
    }
}

/// "Protection is on" or what needs attention, on Today, for the person only.
struct ProtectionCheckCard: View {
    @Environment(AppState.self) private var model
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var items: [ProtectionCheckItem]?
    @State private var working = false

    var body: some View {
        Group {
            if let items {
                VStack(alignment: .leading, spacing: 12) {
                    Label(items.isEmpty ? "Protection is on" : "Protection needs attention",
                          systemImage: items.isEmpty ? "checkmark.shield.fill" : "exclamationmark.shield.fill")
                        .font(.headline)
                        .foregroundStyle(items.isEmpty ? ShieldTheme.connected : ShieldTheme.held)
                        .accessibilityIdentifier("protection-check-title")
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.title).font(.subheadline.weight(.semibold))
                            Text(item.detail).font(.subheadline).foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                            fixButton(item.fix).disabled(working)
                        }
                        .padding(.top, 4)
                    }
                    if items.isEmpty {
                        Text("Shield checked what it can on this phone. Test calls check the rest.")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 8)
            } else {
                ProgressView("Checking your setup…").padding(.vertical, 8)
            }
        }
        .task(id: model.overview?.status) { await refresh() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await refresh() } } }
    }

    @ViewBuilder
    private func fixButton(_ fix: ProtectionCheckItem.Fix) -> some View {
        switch fix {
        case .setup:
            if model.isTrial {
                NavigationLink { ForwardingSetupView() } label: { Text("Open setup") }
            } else {
                NavigationLink(value: AppRoute.setup) { Text("Open setup") }
            }
        case .saveShieldContact(let number):
            Button("Save Shield contact") { Task { await perform { try await SaveShieldContact.save(number: number) } } }
                .buttonStyle(.bordered).accessibilityIdentifier("protection-fix-contact")
        case .contactsAccess:
            Button("Allow Contacts access") {
                Task { await perform { _ = try await CNContactStore().requestAccess(for: .contacts) } }
            }.buttonStyle(.bordered)
        case .allowNotifications:
            Button("Turn on notifications") {
                Task {
                    let settings = await UNUserNotificationCenter.current().notificationSettings()
                    if settings.authorizationStatus == .denied, let url = URL(string: UIApplication.openSettingsURLString) { openURL(url); return }
                    await perform {
                        if try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) {
                            UIApplication.shared.registerForRemoteNotifications()
                        }
                    }
                }
            }.buttonStyle(.bordered)
        case .sharedContacts:
            NavigationLink(value: AppRoute.trustedNumbers) { Text("Update shared contacts") }
        }
    }

    private func perform(_ action: () async throws -> Void) async {
        working = true
        defer { working = false }
        do { try await action() } catch { model.handle(error) }
        await refresh()
    }

    private func refresh() async {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--uitesting-protection-check") {
            if arguments.contains("--protection-check-call-failed") {
                items = [.init(id: "setup-check", title: "Unknown callers are ringing your phone", detail: "Shield’s daily check call rang your phone. Turn Silence Unknown Callers back on in Phone settings.", fix: .setup)]
                return
            }
            items = arguments.contains("--protection-check-good") ? [] : [
                .init(id: "paused", title: "Protection is paused", detail: "Unknown callers go to voicemail without being screened.", fix: .setup),
                .init(id: "contact", title: "Shield’s number isn’t in your Contacts", detail: "Calls Shield offers you may go to voicemail instead of ringing.", fix: .saveShieldContact("+15125550100"))]
            return
        }
        #endif
        guard model.isOwner, !model.isDemo, let id = model.selectedPersonID, let status = model.overview?.status else { return }
        let forwarding: ForwardingStatus? = try? await model.api.send("/api/forwarding", participantID: id)
        guard model.selectedPersonID == id else { return }
        items = await ProtectionCheck.run(status: status, forwarding: forwarding, notificationsAvailable: model.service?.notificationsAvailable == true)
    }
}

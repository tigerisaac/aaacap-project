import Contacts
import Observation
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
            items.append(.init(id: "paused", title: "Call checks are paused", detail: "Unfamiliar callers may leave voicemail without a scam check.", fix: .setup))
        } else if status == "restoring" {
            items.append(.init(id: "restoring", title: "Finish disconnecting Shield", detail: "Check that ordinary calls and voicemail work.", fix: .setup))
        }
        if let number = forwarding?.shieldNumber {
            switch CNContactStore.authorizationStatus(for: .contacts) {
            case .authorized, .limited:
                if !hasContact(number) {
                    items.append(.init(id: "contact", title: "Save Shield in Contacts",
                        detail: "This helps calls from Shield ring your phone.", fix: .saveShieldContact(number)))
                }
            default:
                items.append(.init(id: "contacts-access", title: "Allow Shield to check Contacts",
                    detail: "We need to check that Shield’s number is saved.", fix: .contactsAccess(number)))
            }
        }
        if notificationsAvailable {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            if settings.authorizationStatus != .authorized && settings.authorizationStatus != .provisional {
                items.append(.init(id: "notifications", title: "Notifications are off", detail: "You won’t hear about new messages or setup problems.", fix: .allowNotifications))
            }
        }
        if let synced = forwarding?.contactsSyncedAt, Date.now.timeIntervalSince(synced) > staleContacts {
            items.append(.init(id: "contacts-sync", title: "Your contacts need updating",
                detail: "Shield may not know people you recently added.", fix: .sharedContacts))
        }
        return items
    }

    private static func hasContact(_ number: String) -> Bool {
        let predicate = CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: number))
        return ((try? CNContactStore().unifiedContacts(matching: predicate, keysToFetch: [CNContactIdentifierKey as CNKeyDescriptor])) ?? []).isEmpty == false
    }
}

/// Actionable setup problems for the owner; a healthy check adds no block to Home.
struct ProtectionCheckCard: View {
    @Environment(AppState.self) private var model
    @Environment(\.openURL) private var openURL
    let check: ProtectionCheckState
    @State private var working = false

    var body: some View {
        Group {
            if let items = check.items, !items.isEmpty {
                DisclosureGroup {
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(item.title).font(.headline)
                            Text(item.detail).foregroundStyle(ShieldTheme.secondaryText)
                            fixButton(item.fix).disabled(working).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        }.padding(.vertical, 8)
                    }
                } label: {
                    Label("Phone setup needs attention", systemImage: "exclamationmark.circle")
                        .font(.headline).foregroundStyle(ShieldTheme.held)
                }
            }
        }
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
                .buttonStyle(.bordered).buttonBorderShape(.capsule).accessibilityIdentifier("protection-fix-contact")
        case .contactsAccess:
            Button(CNContactStore.authorizationStatus(for: .contacts) == .notDetermined ? "Allow Contacts" : "Open Contacts settings") {
                if CNContactStore.authorizationStatus(for: .contacts) == .notDetermined {
                    Task { await perform { _ = try await CNContactStore().requestAccess(for: .contacts) } }
                } else if let url = URL(string: UIApplication.openSettingsURLString) {
                    openURL(url)
                }
            }.buttonStyle(.bordered).buttonBorderShape(.capsule)
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
            }.buttonStyle(.bordered).buttonBorderShape(.capsule)
        case .sharedContacts:
            NavigationLink(value: AppRoute.trustedNumbers) { Text("Update my contacts") }
        }
    }

    private func perform(_ action: () async throws -> Void) async {
        working = true
        defer { working = false }
        do { try await action() } catch { model.handle(error) }
        await refresh()
    }

    private func refresh() async { await check.refresh(model) }
}

@MainActor
@Observable
final class ProtectionCheckState {
    var items: [ProtectionCheckItem]?

    func refresh(_ model: AppState) async {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--uitesting-protection-check") || model.isTestAccount {
            items = arguments.contains("--protection-check-good") ? [] : [
                .init(id: "paused", title: "Call checks are paused", detail: "Unfamiliar callers may leave voicemail without a scam check.", fix: .setup),
                .init(id: "contact", title: "Save Shield in Contacts", detail: "This helps calls from Shield ring your phone.", fix: .saveShieldContact("+15125550100"))]
            return
        }
        #endif
        guard model.isOwner, !model.isDemo, let id = model.selectedPersonID, let status = model.overview?.status else { return }
        let forwarding: ForwardingStatus? = try? await model.api.send("/api/forwarding", participantID: id)
        guard model.selectedPersonID == id else { return }
        items = await ProtectionCheck.run(status: status, forwarding: forwarding, notificationsAvailable: model.service?.notificationsAvailable == true)
    }
}

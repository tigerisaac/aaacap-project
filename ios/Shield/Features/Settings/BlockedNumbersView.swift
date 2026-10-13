import SwiftUI

/// Numbers Shield ends calls from without screening. Helpers can look; only the person can unblock.
struct BlockedNumbersView: View {
    @Environment(AppState.self) private var model
    @State private var items: [BlockedNumber] = []
    @State private var loaded = false
    @State private var pendingUnblock: BlockedNumber?
    @State private var phoneBlocking: Bool?
    @State private var loadError: String?
    @State private var loadAttempts = 0
    @State private var working = false

    var body: some View {
        List {
            if let loadError {
                ShieldGroup { ShieldLoadFailure(title: "Blocked numbers couldn’t load", detail: loadError) { Task { await load() } } }
            } else if !loaded {
                ShieldGroup { ShieldLoadingView(title: "Getting blocked numbers…") }
            } else if items.isEmpty {
                ShieldGroup {
                    ContentUnavailableView("No blocked numbers", systemImage: "hand.raised",
                        description: Text("Numbers blocked by Shield will appear here."))
                }
            }
            if model.isOwner, !model.isPreview, phoneBlocking != nil {
                ShieldGroup {
                    LabeledContent("Block on this iPhone", value: phoneBlocking == true ? "On" : "Off")
                    if phoneBlocking == false {
                        Button("Turn on in Settings", systemImage: "gear") { Task { await CallDirectorySync.openSettings() } }
                    }
                } footer: {
                    Text(phoneBlocking == true
                         ? "Your iPhone blocks these numbers too."
                         : "In Phone settings, open Call Blocking & Identification and turn on Shield.").foregroundStyle(ShieldTheme.secondaryText)
                }
            }
            ShieldGroup {
                ForEach(items) { item in
                    VStack(alignment: .leading, spacing: 10) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(PhoneDisplay.format(item.phone)).font(.headline)
                            Text(item.reasonText).foregroundStyle(ShieldTheme.secondaryText)
                            Text(detail(for: item)).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        }
                        .accessibilityElement(children: .combine)
                        // A visible button, not only a swipe: swipes are hard to discover.
                        if model.isOwner {
                            Button { pendingUnblock = item } label: {
                                Text("Allow calls again")
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .shieldSecondaryButton().disabled(working)
                            .accessibilityLabel("Allow calls from \(PhoneDisplay.format(item.phone)) again")
                            .accessibilityIdentifier("unblock-\(item.phone)")
                        }
                    }
                    .padding(.vertical, 2)
                    .swipeActions {
                        if model.isOwner {
                            Button("Allow calls again") { pendingUnblock = item }.tint(ShieldTheme.action)
                        }
                    }
                    .contextMenu {
                        if model.isOwner { Button("Allow calls again") { pendingUnblock = item } }
                    }
                }
            }
            ShieldGroup {
                DisclosureGroup("About blocked numbers") {
                    Text("Shield stops calls from these numbers. Blocks end after 180 days.")
                    Text(model.isOwner ? "Scammers can use someone else’s number. Allow calls again only if you know who it belongs to." : "Only the person using Shield can allow calls again.")
                }
            }
        }
        .shieldListStyle()
        .navigationTitle("Blocked numbers")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Allow calls from \(pendingUnblock.map { PhoneDisplay.format($0.phone) } ?? "this number")?", isPresented: Binding(
            get: { pendingUnblock != nil }, set: { if !$0 { pendingUnblock = nil } }), titleVisibility: .visible) {
            Button("Allow calls again", role: .destructive) { if let item = pendingUnblock { Task { await unblock(item) } } }
        } message: {
            Text("Shield can check future calls from this number. Only allow calls if you know who it belongs to.")
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func detail(for item: BlockedNumber) -> String {
        let blocked = "Blocked \(item.blockedAt.formatted(date: .abbreviated, time: .omitted))"
        switch item.attempts {
        case 0: return blocked
        case 1: return "\(blocked) · Tried again once"
        default: return "\(blocked) · Tried again \(item.attempts) times"
        }
    }

    private func load() async {
        loadError = nil
        if let failure = PreviewScenario.loadFailure("blocked", attempt: loadAttempts, preview: model.isPreview) {
            loadAttempts += 1
            loadError = failure
            return
        }
        if model.isPreview {
            items = [BlockedNumber(id: String(repeating: "a", count: 64), phone: "+13125550199", reason: "scam",
                blockedAt: .now.addingTimeInterval(-86400), expiresAt: .now.addingTimeInterval(179 * 86400), attempts: 2, lastAttemptAt: .now)]
            loaded = true
            return
        }
        guard let personID = model.selectedPersonID else { return }
        do {
            let response: APIResponses.BlockedNumbers = try await model.api.send("/api/blocked-numbers", participantID: personID)
            guard model.selectedPersonID == personID else { return }
            items = response.items
            loaded = true
            if model.isOwner {
                await CallDirectorySync.update(phones: response.items.map(\.phone))
                phoneBlocking = await CallDirectorySync.isEnabled()
            }
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }

    private func unblock(_ item: BlockedNumber) async {
        pendingUnblock = nil
        guard model.isOwner, !working else { return }
        working = true
        defer { working = false }
        if model.isPreview { items.removeAll { $0.id == item.id }; return }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/blocked-numbers/\(item.id)", method: "DELETE", participantID: model.selectedPersonID)
            items.removeAll { $0.id == item.id }
            await CallDirectorySync.update(phones: items.map(\.phone))
        } catch { model.handle(error) }
    }
}

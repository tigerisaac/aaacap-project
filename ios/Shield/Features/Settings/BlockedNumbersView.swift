import SwiftUI

/// Numbers Shield ends calls from without screening. Helpers can look; only the person can unblock.
struct BlockedNumbersView: View {
    @Environment(AppState.self) private var model
    @State private var items: [BlockedNumber] = []
    @State private var loaded = false
    @State private var pendingUnblock: BlockedNumber?

    var body: some View {
        List {
            Section {
                ForEach(items) { item in
                    VStack(alignment: .leading, spacing: 10) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(item.phone).font(.headline)
                            Text(item.reasonText).foregroundStyle(.secondary)
                            Text(detail(for: item)).font(.subheadline).foregroundStyle(.secondary)
                        }
                        .accessibilityElement(children: .combine)
                        // A visible button, not only a swipe: swipes are hard to discover.
                        if model.isOwner {
                            Button("Unblock", systemImage: "hand.raised.slash") { pendingUnblock = item }
                                .buttonStyle(.bordered).accessibilityIdentifier("unblock-\(item.phone)")
                        }
                    }
                    .padding(.vertical, 2)
                    .swipeActions {
                        if model.isOwner {
                            Button("Unblock") { pendingUnblock = item }.tint(ShieldTheme.action)
                        }
                    }
                    .contextMenu {
                        if model.isOwner { Button("Unblock", systemImage: "hand.raised.slash") { pendingUnblock = item } }
                    }
                }
            } footer: {
                Text(model.isOwner
                     ? "Shield ends calls from these numbers without screening them. Scammers sometimes use real people’s numbers, so each block ends after 180 days. Unblock a number only if you know who it belongs to."
                     : "Shield ends calls from these numbers without screening them. Only the person Shield protects can unblock a number.")
            }
        }
        .overlay {
            if loaded && items.isEmpty {
                ContentUnavailableView("No blocked numbers", systemImage: "hand.raised",
                    description: Text("When Shield stops a scam call, it blocks that number so the caller can’t try again."))
            }
        }
        .navigationTitle("Blocked numbers")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Unblock \(pendingUnblock?.phone ?? "this number")?", isPresented: Binding(
            get: { pendingUnblock != nil }, set: { if !$0 { pendingUnblock = nil } }), titleVisibility: .visible) {
            Button("Unblock", role: .destructive) { if let item = pendingUnblock { Task { await unblock(item) } } }
        } message: {
            Text("Its next call will be screened again. Only unblock a number you know belongs to someone you trust.")
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
        } catch is CancellationError { return } catch { model.handle(error) }
    }

    private func unblock(_ item: BlockedNumber) async {
        pendingUnblock = nil
        guard model.isOwner else { return }
        if model.isPreview { items.removeAll { $0.id == item.id }; return }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/blocked-numbers/\(item.id)", method: "DELETE", participantID: model.selectedPersonID)
            items.removeAll { $0.id == item.id }
        } catch { model.handle(error) }
    }
}

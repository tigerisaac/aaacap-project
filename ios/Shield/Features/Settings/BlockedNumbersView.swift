import SwiftUI

/// Numbers Shield ends calls from without screening. Helpers can look; only the person can unblock.
struct BlockedNumbersView: View {
    @Environment(AppState.self) private var model
    @State private var items: [BlockedNumber] = []
    @State private var loaded = false
    @State private var loadingVisible = false
    @State private var pendingUnblock: BlockedNumber?
    @State private var phoneBlocking: Bool?
    @State private var loadError: String?
    @State private var loadAttempts = 0
    @State private var loadRevision = 0
    @State private var working = false

    var body: some View {
        List {
            if let loadError {
                ShieldGroup { ShieldLoadFailure(title: "Blocked numbers couldn’t load", detail: loadError) { Task { await load() } } }
            } else if !loaded {
                if loadingVisible { ShieldGroup { ShieldLoadingView(title: "Getting blocked numbers…") } }
            } else if items.isEmpty {
                ShieldGroup {
                    ShieldEmptyState(title: "No blocked numbers", symbol: "hand.raised",
                                     detail: "Numbers blocked by Shield will appear here.")
                }
            }
            if model.isOwner, !model.isPreview {
                CallDirectoryStatusView(directory: model.callDirectory, phoneBlocking: phoneBlocking)
            }
            ShieldGroup {
                ForEach(items) { item in
                    VStack(alignment: .leading, spacing: 10) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(PhoneDisplay.format(item.phone)).font(.headline).monospacedDigit()
                            Text(item.reasonText).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            Text(detail(for: item)).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        }
                        .accessibilityElement(children: .combine)
                        // A visible button, not only a swipe: swipes are hard to discover.
                        if model.isOwner {
                            Button { pendingUnblock = item } label: {
                                Text("Allow calls again")
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
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
                ShieldDisclosure("About blocked numbers") {
                    Text("Shield stops calls from these numbers for 180 days. Open Shield to keep this iPhone’s blocking list up to date. Changes on this iPhone take effect after its list refreshes successfully.")
                    Text(model.isOwner ? "Scammers can use someone else’s number. Allow calls again only if you know who it belongs to." : "Only the person using Shield can allow calls again.")
                }
            }
        }
        .deferredLoading(!loaded && loadError == nil, visible: $loadingVisible)
        .shieldListStyle()
        .navigationTitle("Blocked numbers")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Allow calls from \(pendingUnblock.map { PhoneDisplay.format($0.phone) } ?? "this number")?", isPresented: Binding(
            get: { pendingUnblock != nil }, set: { if !$0 { pendingUnblock = nil } })) {
            Button("Allow calls again", role: .destructive) { if let item = pendingUnblock { Task { await unblock(item) } } }
            Button("Keep blocking", role: .cancel) { pendingUnblock = nil }
        } message: {
            Text("Shield can check future calls from this number. Only allow calls if you know who it belongs to.")
        }
        .task { await load() }
        .refreshable { await model.api.invalidateNavigationCache(); await load() }
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
        loadRevision += 1
        let revision = loadRevision
        loadError = nil
        if let failure = PreviewScenario.loadFailure("blocked", attempt: loadAttempts, preview: model.isPreview) {
            loadAttempts += 1
            loadError = failure
            return
        }
        if model.isPreview {
            items = PreviewScenario.emptyData("blocked", preview: model.isPreview) ? [] : [BlockedNumber(id: String(repeating: "a", count: 64), phone: "+13125550199", reason: "scam",
                blockedAt: .now.addingTimeInterval(-86400), expiresAt: .now.addingTimeInterval(179 * 86400), attempts: 2, lastAttemptAt: .now)]
            loaded = true
            return
        }
        guard let personID = model.selectedPersonID else { return }
        let generation = model.sessionGeneration
        let directoryGeneration = model.callDirectory.requestGeneration
        do {
            let response = try await model.api.blockedNumbers(participantID: personID)
            guard model.selectedPersonID == personID, model.sessionGeneration == generation, model.signedIn,
                  loadRevision == revision else { return }
            items = response
            loaded = true
            if model.isOwner {
                await model.updateCallDirectory(response, personID: personID, generation: generation, directoryGeneration: directoryGeneration)
                phoneBlocking = await CallDirectorySync.isEnabled()
            }
        } catch is CancellationError {
            guard !Task.isCancelled, model.selectedPersonID == personID, model.sessionGeneration == generation,
                  model.signedIn, loadRevision == revision else { return }
            // A concurrent account mutation can invalidate pagination without dismissing this screen.
            loadError = APIError.incompleteBlockedNumbers.localizedDescription
        }
        catch {
            guard model.selectedPersonID == personID, model.sessionGeneration == generation, loadRevision == revision else { return }
            loadError = error.localizedDescription
            model.handleSessionFailure(error)
        }
    }

    private func unblock(_ item: BlockedNumber) async {
        pendingUnblock = nil
        guard model.isOwner, !working, let personID = model.selectedPersonID else { return }
        let generation = model.sessionGeneration
        working = true
        defer { working = false }
        if model.isPreview { items.removeAll { $0.id == item.id }; return }
        loadRevision += 1
        model.callDirectory.invalidateRequests()
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/blocked-numbers/\(item.id)", method: "DELETE", participantID: personID)
            guard model.selectedPersonID == personID, model.sessionGeneration == generation, model.signedIn else { return }
            loadRevision += 1
            items.removeAll { $0.id == item.id }
            await model.removeFromCallDirectory(item, personID: personID, generation: generation)
        } catch {
            guard model.selectedPersonID == personID, model.sessionGeneration == generation else { return }
            model.handle(error)
        }
    }
}

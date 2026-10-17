import SwiftUI

struct OverviewView: View {
    @Environment(AppState.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var protectionCheck = ProtectionCheckState()
    @State private var forwarding: ForwardingStatus?
    @State private var checkedAt: Date?
    @State private var checkingStatus = false
    @State private var statusParticipantID: UUID?
    @State private var statusSessionGeneration: Int?
    @State private var statusUpdateFailed = false
    @State private var loadingVisible = false

    var body: some View {
        NavigationShell {
            List {
                PersonContextSection()
                if !model.isDemo || isStatusFixture {
                    ShieldGroup(background: .clear) {
                        TimelineView(.periodic(from: .now, by: 30)) { context in
                            statusCard(now: context.date)
                        }
                    }
                }
                if model.isOwner, showsProtectionCheck, protectionCheck.items?.isEmpty == false {
                    ShieldGroup { ProtectionCheckCard(check: protectionCheck) }
                }
                if let overview = model.overview {
                    ShieldGroup {
                        StoppedCallsCard(count: overview.counts.stoppedTotal) { model.showCalls(.held) }
                    }
                    let messages = overview.recent.filter { $0.voicemail != nil && $0.voicemail?.status != "removed" }
                    ShieldGroup {
                        if messages.isEmpty {
                            Button { model.showCalls(.voicemail) } label: {
                                ActionRow(title: "Messages", detail: "No recent messages", symbol: "tray")
                            }.buttonStyle(.plain)
                        } else {
                            ForEach(messages.prefix(1)) { call in
                                MessageNavigationRow(call: call, kept: model.demoKeptMessages.contains(call.id))
                            }
                            Button { model.showCalls(.voicemail) } label: {
                                HistoryBrowseLabel(title: "All messages")
                            }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                                .accessibilityLabel("All messages")
                                .accessibilityIdentifier("today-messages")
                        }
                    } header: { Text("Messages").shieldHeading(.section).foregroundStyle(ShieldTheme.ink).textCase(nil) }
                    ShieldGroup {
                        if overview.recent.filter({ $0.voicemail == nil }).isEmpty {
                            Text("Your calls will appear here.").foregroundStyle(ShieldTheme.secondaryText)
                        } else {
                            ForEach(overview.recent.filter { $0.voicemail == nil }.prefix(2)) { call in
                                CallNavigationRow(call: call, showsNumber: false)
                            }
                        }
                        Button { model.showCalls(.all) } label: {
                            HistoryBrowseLabel(title: "All calls")
                        }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                            .accessibilityLabel("All calls")
                            .accessibilityIdentifier("home-all-calls")
                    } header: { Text("Recent calls").shieldHeading(.section).foregroundStyle(ShieldTheme.ink).textCase(nil) }
                } else if model.isLoading {
                    if loadingVisible { ShieldGroup { ShieldLoadingView(title: "Getting your calls…") } }
                } else {
                    ShieldGroup {
                        ShieldLoadFailure(title: "Your calls couldn’t load", detail: "Check your internet connection and try again.") {
                            Task { await refresh() }
                        }
                    }
                }
                if model.overview != nil, model.contextError != nil {
                    ShieldGroup {
                        ShieldLoadFailure(title: "These calls may be out of date", detail: "Saved calls and messages are still available. Connect to get new calls.") { Task { await refresh() } }
                    }
                }
            }
            .deferredLoading(model.isLoading && model.overview == nil, visible: $loadingVisible)
            .shieldListStyle()
            .scrollEdgeEffectHidden(for: .top)
            .task(id: "\(model.selectedPersonID?.uuidString ?? "")-\(model.overview?.status ?? "")-\(model.isTestAccount)") {
                if model.isOwner, showsProtectionCheck { await protectionCheck.refresh(model) }
            }
            .shieldLargeTitle("Home")
            .toolbar { if !typeSize.isAccessibilitySize { ToolbarItem(placement: .topBarTrailing) { PersonPicker() } } }
            .refreshable { await refresh() }
            .task(id: model.selectedPersonID) {
                await loadStatus()
                while !Task.isCancelled {
                    do { try await Task.sleep(for: .seconds(60)) } catch { return }
                    if scenePhase == .active { await refresh(force: false) }
                }
            }
            .onChange(of: scenePhase) { _, phase in if phase == .active { Task {
                await loadStatus()
                if model.isOwner, showsProtectionCheck { await protectionCheck.refresh(model) }
            } } }
        }
    }

    @ViewBuilder private func statusCard(now: Date) -> some View {
        let presentation = summary(now: now)
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 20))
        layout {
            Image(systemName: presentation.symbol)
                .font(.system(size: 60, weight: .regular))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(presentation.enabled ? ShieldTheme.connected : ShieldTheme.secondaryText)
                .frame(width: 72, height: 80)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) {
                Text(presentation.title).font(.title3.weight(.semibold)).foregroundStyle(ShieldTheme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("today-status-title").accessibilityAddTraits(.isHeader)
                Text(presentation.detail).foregroundStyle(ShieldTheme.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                if presentation.isSaved, let checkedAt {
                    Text("Last confirmed \(checkedAt.formatted(date: .abbreviated, time: .shortened)).")
                        .font(.footnote).foregroundStyle(ShieldTheme.secondaryText)
                        .accessibilityIdentifier("today-status-confirmed")
                }
                if !model.isDemo, model.isOwner {
                    if presentation.retry {
                        Button(checkingStatus ? "Checking…" : "Try again") { Task { await refresh() } }
                            .disabled(checkingStatus)
                    } else if presentation.needsSetup {
                        if model.isTrial && !presentation.useSetupMenu {
                            NavigationLink(value: AppRoute.forwardingSetup) {
                                Text(presentation.actionTitle)
                            }
                        } else {
                            NavigationLink(presentation.actionTitle, value: AppRoute.setup)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 8)
    }

    private func summary(now: Date) -> HomeStatusPresentation {
        if model.isDemo && !isStatusFixture { return .init(title: model.isOwner ? "Sample phone" : "\(model.person?.name ?? "Your person")’s sample calls", detail: "Try a message or call below.", symbol: "phone.badge.waveform") }
        if !model.isOwner { return .init(title: "\(model.person?.name ?? "Your person")’s calls", detail: model.canListen ? "They’ve shared calls and voicemail with you." : "They’ve shared calls with you.", symbol: "person.2") }
        return .make(status: forwarding, checkedAt: checkedAt, accountStatus: model.overview?.status,
                     checking: checkingStatus, updateFailed: statusUpdateFailed, now: now)
    }

    private var isStatusFixture: Bool {
        #if DEBUG
        model.isPreview && ProcessInfo.processInfo.arguments.contains("--redesign-state")
        #else
        false
        #endif
    }

    /// The setup check reads this phone's Contacts and notification settings, so it never runs in the demo.
    private var showsProtectionCheck: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--uitesting-protection-check") || model.isTestAccount { return true }
        #endif
        return !model.isDemo
    }

    private func refresh(force: Bool = true) async {
        await model.refresh(force: force); await loadStatus(force: force)
        if model.isOwner, showsProtectionCheck { await protectionCheck.refresh(model) }
    }
    private func loadStatus(force: Bool = false) async {
        #if DEBUG
        if isStatusFixture {
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "--redesign-state"), args.indices.contains(i + 1) {
                let state = args[i + 1]
                forwarding = state == "unavailable" ? nil : .redesignFixture(state: ["stale", "refresh-failed"].contains(state) ? "always-on" : state)
                checkedAt = state == "unavailable" ? nil : ["stale", "refresh-failed"].contains(state) ? .now.addingTimeInterval(-120) : .now
                statusUpdateFailed = state == "refresh-failed"
                return
            }
        }
        #endif
        guard !model.isDemo, model.isOwner, let id = model.selectedPersonID else {
            forwarding = nil; checkedAt = nil; statusParticipantID = nil; return
        }
        let generation = model.sessionGeneration
        if statusParticipantID != id || statusSessionGeneration != generation {
            forwarding = nil; checkedAt = nil; statusUpdateFailed = false
            statusParticipantID = id; statusSessionGeneration = generation
        }
        // Restore this owner's last confirmed settings before waiting for the service.
        let saved: (value: ForwardingStatus, savedAt: Date, isFresh: Bool)? = await model.api.savedPhoneSetup("/api/forwarding", participantID: id)
        guard id == model.selectedPersonID, generation == model.sessionGeneration, !Task.isCancelled else { return }
        if let saved, saved.value.participantId == id {
            if saved.savedAt > (checkedAt ?? .distantPast) {
                forwarding = saved.value; checkedAt = saved.savedAt
            }
            if saved.isFresh && !force { statusUpdateFailed = false; return }
        }
        guard !checkingStatus else { return }
        checkingStatus = true
        defer { checkingStatus = false }
        do {
            let snapshot = try await model.api.forwardingSnapshot(participantID: id)
            guard id == model.selectedPersonID, generation == model.sessionGeneration, !Task.isCancelled else { return }
            forwarding = snapshot.status; checkedAt = snapshot.checkedAt; statusUpdateFailed = false
        } catch is CancellationError { return }
        catch {
            guard id == model.selectedPersonID, generation == model.sessionGeneration else { return }
            // A transport error is not evidence that the confirmed setting changed.
            statusUpdateFailed = true
            model.handleSessionFailure(error)
        }
    }

}

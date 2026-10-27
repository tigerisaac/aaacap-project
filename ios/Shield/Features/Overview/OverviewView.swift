import SwiftUI

struct OverviewView: View {
    @Environment(AppState.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var protectionCheck = ProtectionCheckState()
    @State private var forwarding: ForwardingStatus?
    @State private var checkedAt: Date?
    @State private var checkingStatus = false
    @State private var hasLoadedStatus = false
    @State private var statusParticipantID: UUID?
    @State private var statusSessionGeneration: Int?
    @State private var statusRevision = 0
    @State private var statusUpdateFailed = false
    @State private var loadingVisible = false
    @State private var isCancellingDisconnection = false
    @State private var isContinuingDisconnection = false
    /// The status card's action is a real button, so it opens its route here rather than as a list link.
    @State private var statusRoute: AppRoute?

    var body: some View {
        NavigationShell {
            List {
                PersonContextSection()
                if model.isReviewDemo {
                    ShieldGroup {
                        Text("Fictional activity. Your phone is unchanged.").foregroundStyle(ShieldTheme.secondaryText)
                        NavigationLink(value: AppRoute.demoGuide) { ActionRow(title: "About this demo", symbol: "info.circle") }
                    }
                }
                if !model.isDemo || isStatusFixture {
                    ShieldGroup(background: .clear) {
                        TimelineView(.periodic(from: .now, by: 30)) { context in
                            statusCard(now: context.date)
                        }
                        .listRowBackground(ShieldTheme.card)
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
                            Text("No recent messages").foregroundStyle(ShieldTheme.secondaryText)
                        } else {
                            ForEach(messages.prefix(1)) { call in
                                MessageNavigationRow(call: call, kept: model.demoKeptMessages.contains(call.id))
                            }
                        }
                        Button { model.showCalls(.voicemail) } label: {
                            HistoryBrowseLabel(title: "All messages")
                        }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                            .accessibilityLabel("All messages")
                            .accessibilityIdentifier("today-messages")
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
            .navigationDestination(isPresented: $isCancellingDisconnection) {
                if let id = model.selectedPersonID { DisconnectView(participantID: id, cancellationRequested: true) }
            }
            .navigationDestination(item: $statusRoute) { route in
                Group {
                    if route == .forwardingSetup { ForwardingSetupView() } else { PhoneOptionsView() }
                }.environment(\.shieldNavigationRoot, false)
            }
            .navigationDestination(isPresented: $isContinuingDisconnection) {
                if let id = model.selectedPersonID { DisconnectView(participantID: id) }
            }
            .refreshable { await refresh() }
            .task(id: "\(model.selectedPersonID?.uuidString ?? "")-\(model.phoneSetupRevision)") {
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

    /// The status reads in one glance: a badge, a bold state and one line, then the card's one next
    /// action as a real button. Checks on gets the teal card.
    /// Checks on reads as the Calls stopped panel's counterpart: a headline label with its symbol,
    /// then the state as a serif figure. States that need a decision keep a row tile and one button.
    @ViewBuilder private func statusCard(now: Date) -> some View {
        let presentation = summary(now: now)
        if presentation.tone == .on {
            checksOn(presentation)
        } else {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                HStack(alignment: .center, spacing: ShieldTheme.Layout.rowSymbolSpacing) {
                    if !typeSize.isAccessibilitySize {
                        // The tile already frames the symbol, so "pause.circle" becomes "pause".
                        ShieldRowSymbol(systemName: presentation.symbol.hasSuffix(".circle") ? String(presentation.symbol.dropLast(".circle".count)) : presentation.symbol,
                                        color: presentation.tone == .setup ? ShieldTheme.action : ShieldTheme.secondaryText)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text(presentation.title).font(.headline).foregroundStyle(ShieldTheme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("today-status-title").accessibilityAddTraits(.isHeader)
                        Text(presentation.detail).foregroundStyle(ShieldTheme.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                if !model.isDemo || isStatusFixture, model.isOwner { statusActions(presentation) }
            }
            .padding(.vertical, ShieldTheme.Spacing.regular)
        }
    }

    private func checksOn(_ presentation: HomeStatusPresentation) -> some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
            HStack(alignment: .firstTextBaseline, spacing: ShieldTheme.Spacing.regular) {
                Text("Call checks").font(.headline).foregroundStyle(ShieldTheme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Image(systemName: "checkmark.shield").font(.body.weight(.medium))
                    .foregroundStyle(ShieldTheme.connected)
            }
            .accessibilityHidden(true)
            Text("On")
                .font(ShieldTheme.Typography.display.scaled(by: 1.3)).tracking(-0.8)
                .foregroundStyle(ShieldTheme.connected)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityLabel(presentation.title)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("today-status-title")
            Text(presentation.detail).foregroundStyle(ShieldTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, ShieldTheme.Spacing.regular)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private func statusActions(_ presentation: HomeStatusPresentation) -> some View {
        if presentation.canCancelDisconnection, model.selectedPersonID != nil {
            VStack(spacing: ShieldTheme.Spacing.compact) {
                Button { isCancellingDisconnection = true } label: { statusActionLabel("Keep using Shield") }
                    .shieldSecondaryButton()
                    .accessibilityIdentifier("home-cancel-disconnection")
                Button { isContinuingDisconnection = true } label: { statusActionLabel("Finish disconnecting") }
                    .shieldSecondaryButton()
            }
        } else if presentation.retry {
            Button { Task { await refresh() } } label: { statusActionLabel(checkingStatus ? "Checking…" : "Try again") }
                .shieldSecondaryButton().disabled(checkingStatus)
        } else if presentation.needsSetup {
            let route = model.isTrial && !presentation.useSetupMenu ? AppRoute.forwardingSetup : AppRoute.phoneOptions
            if presentation.tone == .setup {
                Button { statusRoute = route } label: { ShieldActionLabel(title: presentation.actionTitle) }
                    .shieldPrimaryButton()
            } else {
                Button { statusRoute = route } label: { statusActionLabel(presentation.actionTitle) }
                    .shieldSecondaryButton()
            }
        }
    }

    private func statusActionLabel(_ title: String) -> some View {
        Text(title).font(.headline).multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
    }

    private func summary(now: Date) -> HomeStatusPresentation {
        if model.isDemo && !isStatusFixture { return .init(title: model.isOwner ? "Sample phone" : "\(model.person?.name ?? "Your person")’s sample calls", detail: "Try a message or call below.", symbol: "phone.badge.waveform") }
        if !model.isOwner { return .init(title: "\(model.person?.name ?? "Your person")’s calls", detail: model.canListen ? "They’ve shared calls and voicemail with you." : "They’ve shared calls with you.", symbol: "person.2") }
        let restored = !hasLoadedStatus && model.restoredPhoneSetup?.status.participantId == model.selectedPersonID
            ? model.restoredPhoneSetup : nil
        return .make(status: forwarding ?? restored?.status, checkedAt: checkedAt ?? restored?.checkedAt,
                     accountStatus: model.overview?.status, checking: checkingStatus || !hasLoadedStatus,
                     updateFailed: statusUpdateFailed, now: now)
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
        defer { hasLoadedStatus = true }
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
        if statusParticipantID != id || statusSessionGeneration != generation || statusRevision != model.phoneSetupRevision {
            statusRevision = model.phoneSetupRevision
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

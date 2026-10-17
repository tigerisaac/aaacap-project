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
                if !model.isDemo || isStatusFixture {
                    ShieldGroup(background: .clear) {
                        TimelineView(.periodic(from: .now, by: 30)) { context in
                            statusCard(now: context.date)
                        }
                        .listRowBackground(HomeStatusBackground(tone: summary(now: .now).tone))
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
    @ViewBuilder private func statusCard(now: Date) -> some View {
        let presentation = summary(now: now)
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
            HStack(alignment: .center, spacing: ShieldTheme.Spacing.content) {
                if !typeSize.isAccessibilitySize {
                    HomeStatusBadge(symbol: presentation.symbol, tone: presentation.tone)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(presentation.title).font(.title2.weight(.semibold)).foregroundStyle(ShieldTheme.ink)
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

/// The status symbol on a circle: solid teal with a white check when checks are on, navy for setup,
/// a quiet tile otherwise. In Dark Mode the bright hues become tinted tiles with a coloured glyph,
/// so the card pops without glowing. Decorative; the title says the state in words.
private struct HomeStatusBadge: View {
    let symbol: String
    let tone: HomeStatusPresentation.Tone
    @Environment(\.colorScheme) private var colorScheme
    @ScaledMetric(relativeTo: .title2) private var size = 52.0

    var body: some View {
        Image(systemName: glyph)
            .font(.system(size: size * 0.44, weight: .semibold))
            .foregroundStyle(ink)
            .frame(width: size, height: size)
            .background(fill, in: .circle)
            .accessibilityHidden(true)
    }

    private var hue: Color? {
        switch tone {
        case .on: ShieldTheme.connected
        case .setup: ShieldTheme.action
        case .neutral: nil
        }
    }

    private var fill: Color {
        guard let hue else { return ShieldTheme.quietSurface }
        return colorScheme == .dark ? hue.opacity(0.18) : hue
    }

    private var ink: Color {
        guard let hue else { return ShieldTheme.secondaryText }
        return colorScheme == .dark ? hue : ShieldTheme.actionInk
    }

    /// The circle is already drawn, so "pause.circle" becomes "pause".
    private var glyph: String { symbol.hasSuffix(".circle") ? String(symbol.dropLast(".circle".count)) : symbol }
}

/// Checks on reads as a calm teal card (fainter in Dark Mode); every other state keeps the Card surface.
private struct HomeStatusBackground: View {
    let tone: HomeStatusPresentation.Tone
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        ZStack {
            ShieldTheme.card
            if tone == .on { ShieldTheme.connected.opacity(colorScheme == .dark ? 0.06 : 0.1) }
        }
    }
}

import SwiftUI

struct OverviewView: View {
    @Environment(AppState.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var protectionCheck = ProtectionCheckState()
    @State private var forwarding: ForwardingStatus?
    @State private var checkedAt: Date?
    @State private var checkingStatus = false
    @State private var loadingVisible = false

    var body: some View {
        NavigationShell {
            List {
                PersonContextSection()
                if !model.isDemo || isStatusFixture {
                    ShieldGroup {
                        TimelineView(.periodic(from: .now, by: 15)) { context in
                            statusCard(now: context.date)
                        }
                    }
                }
                if model.isOwner, showsProtectionCheck, protectionCheck.items?.isEmpty == false {
                    ShieldGroup { ProtectionCheckCard(check: protectionCheck) }
                }
                if model.showingSavedHistory || model.contextError != nil, let savedAt = model.historySavedAt {
                    ShieldGroup { Text("Saved on this iPhone · Updated \(savedAt.formatted(date: .abbreviated, time: .shortened))")
                        .foregroundStyle(ShieldTheme.secondaryText) }
                }
                if let overview = model.overview {
                    if model.contextError == nil {
                        ShieldGroup {
                            StoppedCallsCard(count: overview.counts.stoppedTotal) { model.showCalls(.held) }
                        }
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
                    if scenePhase == .active { await refresh() }
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
        // The tile matches the rows below, so the title, explanation and action start on their text column.
        HStack(alignment: .top, spacing: ShieldTheme.Layout.rowSymbolSpacing) {
            if !typeSize.isAccessibilitySize {
                ShieldRowSymbol(systemName: presentation.symbol)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(presentation.title).font(.headline).foregroundStyle(ShieldTheme.action)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("today-status-title").accessibilityAddTraits(.isHeader)
                Text(presentation.detail).foregroundStyle(ShieldTheme.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                if !model.isDemo, model.isOwner {
                    if presentation.retry {
                        Button(checkingStatus ? "Checking…" : "Try again") { Task { await refresh() } }
                            .disabled(checkingStatus)
                    } else if presentation.needsSetup {
                        if model.isTrial && !presentation.useSetupMenu {
                            NavigationLink { ForwardingSetupView() } label: {
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

    private struct Summary {
        let title: String
        let detail: String
        let symbol: String
        var retry = false
        var needsSetup = false
        var actionTitle = "Set up my phone"
        var useSetupMenu = false
    }
    private func summary(now: Date) -> Summary {
        if model.isDemo && !isStatusFixture { return .init(title: model.isOwner ? "Sample phone" : "\(model.person?.name ?? "Your person")’s sample calls", detail: "Try a message or call below.", symbol: "phone.badge.waveform") }
        if model.contextError != nil { return .init(title: "Couldn’t check your phone", detail: "Saved calls and messages still work. Shield can check incoming calls without this app being open; its current status needs a connection.", symbol: "wifi.exclamationmark", retry: true) }
        if !model.isOwner { return .init(title: "\(model.person?.name ?? "Your person")’s calls", detail: model.canListen ? "They’ve shared calls and voicemail with you." : "They’ve shared calls with you.", symbol: "person.2") }
        if checkingStatus && checkedAt == nil { return .init(title: "Checking your phone…", detail: "One moment.", symbol: "arrow.clockwise") }
        guard let status = forwarding, let checkedAt, now.timeIntervalSince(checkedAt) < 75 else {
            return .init(title: "Couldn’t check your phone", detail: "Please try again.", symbol: "wifi.exclamationmark", retry: true)
        }
        if status.restorationRequested || model.overview?.status == "restoring" { return .init(title: "Disconnecting Shield", detail: "Finish the steps to bring back ordinary calls.", symbol: "arrow.uturn.backward.circle", needsSetup: true, actionTitle: "Finish disconnecting") }
        if model.overview?.status == "paused" { return .init(title: "Call checks are paused", detail: "Your phone may still send calls to Shield.", symbol: "pause.circle", needsSetup: true, actionTitle: "Resume call checks", useSetupMenu: true) }
        if !status.consented || !status.prepared || !status.phoneVerified { return .init(title: "Your phone needs setup", detail: "We’ll help you one step at a time.", symbol: "phone.badge.checkmark", needsSetup: true) }
        if status.alwaysOn == true, status.liveScreening == true {
            return .init(title: "Call checks are on", detail: "Shield checks calls that reach it. During quiet hours or when the daily limit is reached, callers can leave a message.", symbol: "phone.badge.waveform")
        }
        if status.active, status.liveScreening == true, let expiry = status.expiresAt, expiry > now, status.remainingCalls > 0 {
            return .init(title: "Call checks are on", detail: "Calls that reach Shield are checked until \(expiry.formatted(date: .omitted, time: .shortened)).", symbol: "phone.badge.waveform")
        }
        return .init(title: "Call checks are off", detail: "Calls that reach Shield may go to voicemail.", symbol: "clock", needsSetup: true, actionTitle: "Phone options", useSetupMenu: true)
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

    private func refresh() async {
        await model.refresh(); await loadStatus()
        if model.isOwner, showsProtectionCheck { await protectionCheck.refresh(model) }
    }
    private func loadStatus() async {
        #if DEBUG
        if isStatusFixture {
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "--redesign-state"), args.indices.contains(i + 1) {
                let state = args[i + 1]
                forwarding = state == "unavailable" ? nil : .redesignFixture(state: state)
                checkedAt = state == "unavailable" ? nil : state == "stale" ? .now.addingTimeInterval(-120) : .now
                return
            }
        }
        #endif
        guard !model.isDemo, model.isOwner, let id = model.selectedPersonID else { forwarding = nil; checkedAt = nil; return }
        checkingStatus = true
        defer { checkingStatus = false }
        do {
            let snapshot = try await model.api.forwardingSnapshot(participantID: id)
            guard id == model.selectedPersonID else { return }
            forwarding = snapshot.status; checkedAt = snapshot.checkedAt
        } catch is CancellationError { return }
        catch { if id == model.selectedPersonID { forwarding = nil; checkedAt = nil } }
    }

}

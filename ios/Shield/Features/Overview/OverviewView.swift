import SwiftUI

struct OverviewView: View {
    @Environment(AppState.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var forwarding: ForwardingStatus?
    @State private var checkedAt: Date?
    @State private var checkingStatus = false

    var body: some View {
        NavigationShell {
            List {
                Section {
                    TimelineView(.periodic(from: .now, by: 15)) { context in
                        statusCard(now: context.date)
                    }
                }
                .listRowSeparator(.hidden)
                .listRowBackground(ShieldTheme.card)

                if model.isOwner, showsProtectionCheck {
                    Section { ProtectionCheckCard() }.listRowBackground(ShieldTheme.card)
                }

                if let overview = model.overview {
                    if overview.counts.messages > 0 {
                        Section {
                            Button { model.showCalls(.voicemail) } label: {
                                HStack(spacing: 12) {
                                    Label {
                                        ViewThatFits(in: .horizontal) {
                                            HStack {
                                                Text("Messages").foregroundStyle(Color.primary)
                                                Spacer(minLength: 8)
                                                messageCount(overview)
                                            }
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text("Messages").foregroundStyle(Color.primary)
                                                messageCount(overview)
                                            }
                                        }
                                    } icon: {
                                        Image(systemName: "waveform").foregroundStyle(ShieldTheme.message)
                                    }
                                    Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                                        .accessibilityHidden(true)
                                }
                                .frame(minHeight: 44).contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityElement(children: .combine)
                            .accessibilityHint("Shows voicemail in Calls")
                            .accessibilityIdentifier("today-messages")
                        }
                    }
                    Section {
                        if overview.recent.isEmpty {
                            ContentUnavailableView("No recent calls", systemImage: "phone", description: Text("Calls that reach Shield appear here."))
                        } else {
                            ForEach(overview.recent.prefix(3)) { call in
                                NavigationLink(value: call) { CallRow(call: call) }
                            }
                            Button("See All Calls") { model.showCalls(.all) }.frame(minHeight: 44)
                        }
                    } header: { Text("Recent").foregroundStyle(ShieldTheme.secondaryText) }
                } else if model.isLoading {
                    Section { ShieldLoadingView(title: "Loading activity…") }
                } else {
                    Section {
                        ShieldNotice(title: "Activity couldn’t load", detail: "Check your connection and try again.", symbol: "wifi.exclamationmark")
                        Button("Try Again", systemImage: "arrow.clockwise") { Task { await refresh() } }.frame(minHeight: 44)
                    }
                }
            }
            .shieldListStyle()
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { NavigationLink(value: AppRoute.settings) { Label("Settings", systemImage: "gearshape") } }
                ToolbarItem(placement: .topBarTrailing) { PersonPicker() }
            }
            .refreshable { await refresh() }
            .task(id: model.selectedPersonID) {
                await loadStatus()
                while !Task.isCancelled {
                    do { try await Task.sleep(for: .seconds(60)) } catch { return }
                    if scenePhase == .active { await refresh() }
                }
            }
            .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await loadStatus() } } }
        }
    }

    @ViewBuilder private func statusCard(now: Date) -> some View {
        let presentation = summary(now: now)
        VStack(alignment: .leading, spacing: 12) {
            let symbol = Image(systemName: presentation.symbol).font(.title2)
                .foregroundStyle(ShieldTheme.action)
                .contentTransition(.symbolEffect(.replace))
                .accessibilityHidden(true)
            let title = Text(presentation.title).font(.title2.bold())
                .accessibilityIdentifier("today-status-title").accessibilityAddTraits(.isHeader)
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 8) { symbol; title }
            } else {
                HStack(alignment: .firstTextBaseline, spacing: 10) { symbol; title }
            }
            Text(presentation.detail).foregroundStyle(ShieldTheme.secondaryText).fixedSize(horizontal: false, vertical: true)
            if model.isDemo {
                Button { model.showCalls(.all) } label: { ShieldActionLabel(title: "Explore sample calls") }.shieldPrimaryButton()
                if !model.isTestAccount {
                    Button("Exit Demo") { Task { await model.signOut() } }
                        .buttonStyle(.borderless)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
            } else if model.isOwner {
                if presentation.retry {
                    Button { Task { await refresh() } } label: { ShieldActionLabel(title: "Try Again", isWorking: checkingStatus) }.shieldPrimaryButton().disabled(checkingStatus)
                } else if model.isTrial {
                    NavigationLink { ForwardingSetupView() } label: { ShieldActionLabel(title: presentation.title == "Restoring your phone" ? "Continue restoration" : "View phone setup") }.shieldPrimaryButton()
                } else {
                    NavigationLink(value: AppRoute.setup) { ShieldActionLabel(title: "View phone setup") }.shieldPrimaryButton()
                }
            }
            if !model.isDemo, model.isOwner {
                DisclosureGroup("About this status") {
                    Text("Shield can’t read your carrier settings. Screening doesn’t verify a caller’s identity.")
                        .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                }.font(.subheadline)
                if let checkedAt { Text("Last checked \(checkedAt.formatted(date: .omitted, time: .shortened))").font(.caption).foregroundStyle(ShieldTheme.secondaryText) }
            }
        }
        .padding(.vertical, 8)
    }

    private struct Summary { let title: String; let detail: String; let symbol: String; var retry = false }
    private func summary(now: Date) -> Summary {
        if model.isDemo && !isStatusFixture { return .init(title: "Try Shield", detail: "Sample activity. Your phone settings are unchanged.", symbol: "phone.badge.waveform") }
        if model.contextError != nil { return .init(title: "Status unavailable", detail: "Couldn’t refresh. Current phone status is unknown.", symbol: "wifi.exclamationmark", retry: true) }
        if !model.isOwner { return .init(title: "\(model.person?.name ?? "Your person")’s call activity", detail: model.canListen ? "Shared history & voicemail." : "Shared history. Voicemail stays private.", symbol: "person.2") }
        if checkingStatus && checkedAt == nil { return .init(title: "Checking phone status…", detail: "Updating…", symbol: "arrow.clockwise") }
        guard let status = forwarding, let checkedAt, now.timeIntervalSince(checkedAt) < 75 else {
            return .init(title: "Status unavailable", detail: "Current screening status is unknown. Try again.", symbol: "wifi.exclamationmark", retry: true)
        }
        if status.restorationRequested || model.overview?.status == "restoring" { return .init(title: "Restoring your phone", detail: "Disconnect forwarding, then check calls and voicemail.", symbol: "arrow.uturn.backward.circle") }
        if model.overview?.status == "paused" { return .init(title: "Call screening paused", detail: "Callbacks paused. Carrier forwarding may still be connected.", symbol: "pause.circle") }
        if !status.consented || !status.prepared || !status.phoneVerified { return .init(title: "Finish phone setup", detail: "Complete setup and call checks to use screening.", symbol: "phone.badge.checkmark") }
        if status.active, status.liveScreening == true, let expiry = status.expiresAt, expiry > now, status.remainingCalls > 0 {
            return .init(title: "Screening window open", detail: "\(status.remainingCalls) calls remaining · ends \(expiry.formatted(date: .omitted, time: .shortened)). Screening is subject to service availability.", symbol: "phone.badge.waveform")
        }
        return .init(title: "Screening window closed", detail: "Forwarded calls may go to voicemail without screening.", symbol: "clock")
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

    private func messageCount(_ overview: Overview) -> some View {
        Text("\(overview.counts.messages) this week").foregroundStyle(ShieldTheme.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
    }

    private func refresh() async { await model.refresh(); await loadStatus() }
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
            let status: ForwardingStatus = try await model.api.send("/api/forwarding", participantID: id)
            guard id == model.selectedPersonID else { return }
            forwarding = status; checkedAt = .now
        } catch { if id == model.selectedPersonID { forwarding = nil; checkedAt = nil } }
    }

}

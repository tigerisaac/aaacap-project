import SwiftUI

struct OverviewView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        NavigationShell {
            List {
                if let overview = model.overview {
                    if model.isOwner, showsProtectionCheck {
                        Section { ProtectionCheckCard() }.listRowBackground(ShieldTheme.card)
                    }
                    if !model.isDemo {
                        Section {
                            status(overview)
                        }
                        .listRowBackground(ShieldTheme.card)
                    }

                    Section {
                        if overview.recent.isEmpty {
                            ContentUnavailableView("No activity yet", systemImage: "phone",
                                description: Text("Calls that reach Shield will appear here."))
                        } else {
                            ForEach(overview.recent.prefix(5)) { call in
                                NavigationLink(value: call) { CallRow(call: call, showsNumber: false) }
                            }
                        }
                    } header: {
                        HStack {
                            Text("Recent calls").font(.title3.weight(.semibold)).foregroundStyle(Color.primary).textCase(nil)
                            Spacer()
                            Button("See all") { model.showCalls(.all) }
                                .textCase(nil).frame(minHeight: 44)
                        }
                    }

                    if overview.counts.held + overview.counts.connected + overview.counts.messages > 0 {
                        Section {
                            ViewThatFits(in: .horizontal) {
                                HStack(spacing: 0) { outcomeControls(overview) }
                                VStack(spacing: 0) { outcomeControls(overview) }
                            }
                            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                            .listRowBackground(ShieldTheme.card)
                            .listRowSeparator(.hidden)
                        } header: {
                            Text("This week").font(.title3.weight(.semibold)).foregroundStyle(Color.primary)
                                .textCase(nil).padding(.bottom, 8)
                        }

                    }

                    Section {
                        NavigationLink(value: AppRoute.help) {
                            Label("Get help", systemImage: "lifepreserver.fill")
                                .foregroundStyle(ShieldTheme.action)
                                .padding(.vertical, 6)
                        }
                    }
                } else if model.isLoading {
                    ProgressView("Loading activity…")
                        .frame(maxWidth: .infinity, minHeight: 180)
                } else {
                    ContentUnavailableView("Activity couldn’t load", systemImage: "wifi.exclamationmark",
                        description: Text("Pull down to try again."))
                }
            }
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    NavigationLink(value: AppRoute.settings) { Label("Settings", systemImage: "gearshape") }
                }
                ToolbarItem(placement: .topBarTrailing) { PersonPicker() }
            }
            .refreshable { await model.refresh() }
            .scrollContentBackground(.hidden)
            .background(ShieldTheme.surface)
        }
    }

    private var showsProtectionCheck: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--uitesting-protection-check") { return true }
        #endif
        return !model.isDemo
    }

    @ViewBuilder
    private func status(_ overview: Overview) -> some View {
        if model.isOwner {
            if model.isTrial {
                NavigationLink { ForwardingSetupView() } label: { statusLabel(overview) }
            } else {
                NavigationLink(value: AppRoute.setup) { statusLabel(overview) }
            }

        } else {
            statusLabel(overview)
        }
    }

    private func statusLabel(_ overview: Overview) -> some View {
        Label {
            Text(statusTitle(overview))
                .font(.headline)
                .foregroundStyle(Color.primary)
                .fixedSize(horizontal: false, vertical: true)
        } icon: {
            Image(systemName: overview.status == "paused" ? "pause.circle" : "phone")
                .foregroundStyle(ShieldTheme.action)
        }
        .padding(.vertical, 8)
    }

    private func statusTitle(_ overview: Overview) -> String {
        if model.isTrial {
            return overview.status == "restoring" ? "Restore and check your phone" : "Phone setup and call tests"
        }
        if overview.status == "paused" { return "Call screening paused" }
        return overview.lastTestAt == nil ? "Phone setup needs a test" : "Phone setup tested"
    }

    @ViewBuilder
    private func outcomeControls(_ overview: Overview) -> some View {
        OutcomeControl(title: "Held", count: overview.counts.held, symbol: "hand.raised.fill", color: ShieldTheme.held) {
            model.showCalls(.held)
        }
        OutcomeControl(title: "Connected", count: overview.counts.connected, symbol: "phone.fill", color: ShieldTheme.connected) {
            model.showCalls(.connected)
        }
        OutcomeControl(title: "Messages", count: overview.counts.messages, symbol: "waveform", color: ShieldTheme.message) {
            model.showCalls(.voicemail)
        }
    }
}

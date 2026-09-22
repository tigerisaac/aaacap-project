import SwiftUI

struct OverviewView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        NavigationShell {
            List {
                if let overview = model.overview {
                    Section {
                        status(overview)
                    }
                    .listRowBackground(ShieldTheme.action.opacity(0.08))

                    Section("This week") {
                        ViewThatFits(in: .horizontal) {
                            HStack(spacing: 12) { outcomeControls(overview) }
                            VStack(spacing: 12) { outcomeControls(overview) }
                        }
                        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }

                    Section {
                        if overview.recent.isEmpty {
                            ContentUnavailableView("No activity yet", systemImage: "phone",
                                description: Text("Calls that reach Shield will appear here."))
                        } else {
                            ForEach(overview.recent.prefix(5)) { call in
                                NavigationLink(value: call) { CallRow(call: call) }
                            }
                        }
                    } header: {
                        HStack {
                            Text("Recent calls")
                            Spacer()
                            Button("See all") { model.showCalls(.all) }
                                .textCase(nil).frame(minHeight: 44)
                        }
                    } footer: {
                        Text("Screened doesn’t mean verified.")
                    }

                    Section {
                        NavigationLink(value: AppRoute.help) {
                            Label("Something doesn’t feel right?", systemImage: "lifepreserver.fill")
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

    @ViewBuilder
    private func status(_ overview: Overview) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: overview.status == "paused" ? "pause.circle.fill" : "phone.circle.fill")
                .font(.title).foregroundStyle(ShieldTheme.action)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(model.isDemo ? "A look inside Shield" : model.isTrial ? "Shield trial" : overview.status == "paused" ? "Call offers paused" : "Your phone setup")
                    .font(.headline)
                if model.isDemo {
                    Text("Sample calls. No phone settings changed.").font(.subheadline).foregroundStyle(.secondary)
                } else if model.isTrial {
                    Text(overview.status == "paused" ? "Trial screening paused." : "Screening on your test number.")
                        .font(.subheadline).foregroundStyle(.secondary)
                } else if let date = overview.lastTestAt {
                    Text("Routing last tested \(date.formatted(date: .abbreviated, time: .omitted))")
                        .font(.subheadline).foregroundStyle(.secondary)
                } else {
                    Text("A routing test is needed.").font(.subheadline).foregroundStyle(.secondary)
                }
                if model.isOwner {
                    NavigationLink("View setup", value: AppRoute.setup)
                        .font(.subheadline.weight(.semibold)).frame(minHeight: 44)
                }
            }
        }
        .padding(.vertical, 6)
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

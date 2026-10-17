import SwiftUI

struct VoicemailView: View {
    @Environment(AppState.self) private var app
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var inbox = VoicemailInbox()
    @State private var keptOnly = false
    @State private var filter = MessageFilter.all
    @State private var loadingVisible = false
    private var showsKindFilter: Bool {
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--uitesting-message-filters") { return true }
        #endif
        return !app.isDemo
    }
    private var initialLoading: Bool { inbox.loading && inbox.calls.isEmpty && !inbox.hasLoaded }

    private var messages: [CallRecord] {
        inbox.calls.filter { $0.voicemail?.status != "removed" && filter.includes($0) && (!keptOnly || app.demoKeptMessages.contains($0.id)) }
    }
    private var removed: [CallRecord] { inbox.calls.filter { $0.voicemail?.status == "removed" && filter.includes($0) } }

    var body: some View {
        NavigationShell {
            List {
                PersonContextSection()
                if showsKindFilter {
                    ShieldGroup(background: .clear) {
                        if typeSize >= .xxxLarge {
                            Menu { kindPicker } label: {
                                HStack {
                                    Text(filter == .all ? "All messages" : filter.label)
                                    Spacer()
                                    Image(systemName: "chevron.down").accessibilityHidden(true)
                                }
                                .padding(ShieldTheme.Spacing.content)
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            }
                            .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
                            .accessibilityLabel("Message type, \(filter.label)")
                            .accessibilityIdentifier("message-filter")
                        } else {
                            kindPicker.pickerStyle(.segmented).controlSize(.large)
                                .accessibilityIdentifier("message-filter")
                        }
                    }.listRowInsets(EdgeInsets())
                }
                if !app.isDemo, app.isOwner, let error = app.audioSyncError {
                    ShieldGroup { ShieldNotice(title: "Recordings aren’t saved yet", detail: error, symbol: "arrow.down.circle") }
                }
                if app.isDemo, !showsKindFilter, app.isOwner, app.canListen {
                    ShieldGroup(background: .clear) {
                        if typeSize >= .xxxLarge {
                            Menu {
                                messagePicker
                            } label: {
                                HStack(alignment: .firstTextBaseline) {
                                    Text(keptOnly ? "Kept messages" : "All messages")
                                        .fixedSize(horizontal: false, vertical: true)
                                    Spacer(minLength: ShieldTheme.Spacing.compact)
                                    Image(systemName: "chevron.down").accessibilityHidden(true)
                                }
                                .padding(ShieldTheme.Spacing.content)
                                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                            }
                            .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
                            .accessibilityLabel("Messages, \(keptOnly ? "Kept" : "All")")
                            .accessibilityHint("Choose which messages to show")
                            .accessibilityIdentifier("sample-message-filter")
                        } else {
                            messagePicker.pickerStyle(.segmented).controlSize(.large)
                                .accessibilityIdentifier("sample-message-filter")
                        }
                    }
                    .listRowInsets(EdgeInsets())
                }
                if let error = inbox.error {
                    ShieldGroup {
                        ShieldLoadFailure(title: "Messages couldn’t load", detail: error) { Task { await inbox.load(app) } }
                    }
                }
                if initialLoading {
                    // Progress stays in the toolbar without inserting a large placeholder row.
                } else if messages.isEmpty, inbox.error == nil {
                    ShieldGroup {
                        ContentUnavailableView(keptOnly ? "No kept messages yet" : filter.emptyTitle, systemImage: "tray",
                            description: Text(keptOnly ? "Open a sample message and tap Keep this message." : "Voicemail and saved notices will appear here."))
                    }
                } else {
                    ShieldGroup {
                        ForEach(messages) { call in
                            MessageNavigationRow(call: call, kept: app.demoKeptMessages.contains(call.id))
                        }
                    }
                }
                if !removed.isEmpty, !keptOnly {
                    ShieldGroup {
                        ShieldDisclosure("Removed messages") {
                            ForEach(removed) { call in
                                MessageNavigationRow(call: call)
                            }
                        }
                    }
                }
                if inbox.nextCursor != nil {
                    ShieldGroup {
                        Button(inbox.loading ? "Getting more…" : "Older messages") { Task { await inbox.load(app, more: true) } }
                            .font(.body.weight(.medium))
                            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget).disabled(inbox.loading)
                    }
                }
            }
            .deferredLoading(inbox.loading, visible: $loadingVisible)
            .shieldListStyle()
            .shieldLargeTitle("Messages")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if loadingVisible { ProgressView().accessibilityLabel("Updating messages").accessibilityIdentifier("messages-refresh-progress") }
                }
                if !typeSize.isAccessibilitySize { ToolbarItem(placement: .topBarTrailing) { PersonPicker() } }
            }
            .sensoryFeedback(.selection, trigger: filter)
            .task { await inbox.load(app) }
            .onChange(of: app.localMessages.map(\.call)) { _, _ in Task { await inbox.load(app) } }
            .refreshable {
                await app.api.invalidateNavigationCache()
                await inbox.load(app)
            }
        }
    }

    private var kindPicker: some View {
        Picker("Message type", selection: $filter) {
            ForEach(MessageFilter.allCases) { Text($0.label).tag($0) }
        }
    }

    private var messagePicker: some View {
        Picker("Messages", selection: $keptOnly) {
            Text("All").tag(false)
            Text("Kept").tag(true)
        }
    }
}

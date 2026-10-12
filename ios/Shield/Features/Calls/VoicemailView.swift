import SwiftUI

struct VoicemailView: View {
    @Environment(AppState.self) private var app
    @State private var inbox = VoicemailInbox()
    @State private var keptOnly = false

    private var messages: [CallRecord] {
        inbox.calls.filter { $0.voicemail?.status != "removed" && (!keptOnly || app.demoKeptMessages.contains($0.id)) }
    }
    private var removed: [CallRecord] { inbox.calls.filter { $0.voicemail?.status == "removed" } }

    var body: some View {
        NavigationShell {
            List {
                if app.isDemo, app.isOwner, app.canListen {
                    Section {
                        Text("Try summaries and kept messages.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        Picker("Messages", selection: $keptOnly) {
                            Text("All").tag(false)
                            Text("Kept").tag(true)
                        }.pickerStyle(.segmented).accessibilityIdentifier("sample-message-filter")
                    }
                }
                if let error = inbox.error {
                    Section {
                        ShieldNotice(title: "Voicemail couldn’t load", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try again") { Task { await inbox.load(app) } }
                    }
                }
                if inbox.loading, inbox.calls.isEmpty {
                    Section { ShieldLoadingView(title: "Getting your messages…") }
                } else if messages.isEmpty, inbox.error == nil {
                    Section {
                        ContentUnavailableView(keptOnly ? "No kept messages yet" : "No voicemail yet", systemImage: "recordingtape",
                            description: Text(keptOnly ? "Open a sample message and tap Keep this message." : "Messages left with Shield will appear here."))
                    }
                } else {
                    Section {
                        ForEach(messages) { call in
                            NavigationLink(value: call) {
                                VoicemailRow(call: call, showsPreview: app.isDemo && app.canListen, kept: app.demoKeptMessages.contains(call.id))
                            }
                        }
                    }
                }
                if !removed.isEmpty, !keptOnly {
                    Section {
                        DisclosureGroup("Removed messages") {
                            ForEach(removed) { call in
                                NavigationLink(value: call) { VoicemailRow(call: call) }
                            }
                        }
                    }
                }
                if inbox.nextCursor != nil {
                    Section {
                        Button(inbox.loading ? "Getting more…" : "Older messages") { Task { await inbox.load(app, more: true) } }
                            .disabled(inbox.loading)
                    }
                }
            }
            .shieldListStyle()
            .navigationTitle("Voicemail")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { PersonPicker() } }
            .task { await inbox.load(app) }
            .refreshable { await inbox.load(app) }
        }
    }
}

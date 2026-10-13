import SwiftUI

struct VoicemailView: View {
    @Environment(AppState.self) private var app
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var inbox = VoicemailInbox()
    @State private var keptOnly = false

    private var messages: [CallRecord] {
        inbox.calls.filter { $0.voicemail?.status != "removed" && (!keptOnly || app.demoKeptMessages.contains($0.id)) }
    }
    private var removed: [CallRecord] { inbox.calls.filter { $0.voicemail?.status == "removed" } }

    var body: some View {
        NavigationShell {
            List {
                PersonContextSection()
                if app.isDemo, app.isOwner, app.canListen {
                    ShieldGroup(background: .clear) {
                        Picker("Messages", selection: $keptOnly) {
                            Text("All").tag(false)
                            Text("Kept").tag(true)
                        }.pickerStyle(.segmented).accessibilityIdentifier("sample-message-filter")
                    }
                    .listRowInsets(EdgeInsets())
                }
                if let error = inbox.error {
                    ShieldGroup {
                        ShieldLoadFailure(title: "Messages couldn’t load", detail: error) { Task { await inbox.load(app) } }
                    }
                }
                if inbox.loading, inbox.calls.isEmpty {
                    ShieldGroup { ShieldLoadingView(title: "Getting your messages…") }
                } else if messages.isEmpty, inbox.error == nil {
                    ShieldGroup {
                        ContentUnavailableView(keptOnly ? "No kept messages yet" : "No messages yet", systemImage: "tray",
                            description: Text(keptOnly ? "Open a sample message and tap Keep this message." : "Voicemail and saved notices will appear here."))
                    }
                } else {
                    ShieldGroup {
                        ForEach(messages) { call in
                            NavigationLink(value: call) {
                                VoicemailRow(call: call, showsPreview: app.canListen, kept: app.demoKeptMessages.contains(call.id))
                            }
                        }
                    }
                }
                if !removed.isEmpty, !keptOnly {
                    ShieldGroup {
                        DisclosureGroup("Removed messages") {
                            ForEach(removed) { call in
                                NavigationLink(value: call) { VoicemailRow(call: call) }
                            }
                        }
                    }
                }
                if inbox.nextCursor != nil {
                    ShieldGroup {
                        Button(inbox.loading ? "Getting more…" : "Older messages") { Task { await inbox.load(app, more: true) } }
                            .disabled(inbox.loading)
                    }
                }
            }
            .shieldListStyle()
            .navigationTitle("Messages")
            .toolbar { if !typeSize.isAccessibilitySize { ToolbarItem(placement: .topBarTrailing) { PersonPicker() } } }
            .task { await inbox.load(app) }
            .refreshable { await inbox.load(app) }
        }
    }
}

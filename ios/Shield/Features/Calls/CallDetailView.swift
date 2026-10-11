import SwiftUI

struct CallDetailView: View {
    let initialCall: CallRecord
    @Environment(AppState.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var updatedCall: CallRecord?
    @State private var events: [CallEvent] = []
    @State private var player = VoicePlayer()
    @State private var confirmDelete = false
    @State private var confirmRestore = false
    @State private var restoring = false
    @State private var isVisible = false
    private var call: CallRecord { updatedCall ?? initialCall }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 14) {
                    OutcomeBadge(outcome: call.outcome)
                    Text(call.title).font(.title2.bold())
                    Text(call.callerNumber).font(.body).foregroundStyle(.secondary)
                    Text(call.occurredAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                .padding(.vertical, 12)
            } footer: {
                Text("Screened doesn’t mean verified.")
            }
            .listRowBackground(ShieldTheme.color(for: call.outcome).opacity(0.08))
            Section("What happened") {
                Text(call.detail)
                if call.monitored == true {
                    Label("Transcribed for connected-call protection", systemImage: "waveform").font(.subheadline).foregroundStyle(.secondary)
                }
            }
            if let voicemail = call.voicemail {
                Section("Voicemail") {
                    if voicemail.status == "ready", model.canListen {
                        Button {
                            Task { await togglePlayback(voicemail) }
                        } label: {
                            Label(player.loading ? "Loading…" : player.playing ? "Stop playback" : "Play message · \(voicemail.durationLabel)",
                                  systemImage: player.playing ? "stop.circle.fill" : "play.circle.fill")
                                .font(.headline).padding(.vertical, 8)
                        }
                        .disabled(player.loading)
                        if model.isOwner {
                            Button("Delete message", role: .destructive) { confirmDelete = true }
                                .confirmationDialog("Delete this voicemail?", isPresented: $confirmDelete, titleVisibility: .visible) {
                                    Button("Delete message", role: .destructive) { Task { await delete(voicemail) } }
                                }
                        }
                    } else if voicemail.status == "removed" {
                        // Not playable while removed: a scam message often asks her to call a number back.
                        Label("Removed by Shield", systemImage: "trash.slash").font(.headline)
                        if voicemail.isRestorable, model.canListen {
                            Button {
                                confirmRestore = true
                            } label: {
                                Label(restoring ? "Restoring…" : "Restore message", systemImage: "arrow.uturn.backward.circle")
                            }
                            .disabled(restoring || model.isDemo)
                            .accessibilityIdentifier("restore-voicemail")
                            .confirmationDialog("Restore this message?", isPresented: $confirmRestore, titleVisibility: .visible) {
                                Button("Restore message") { Task { await restore(voicemail) } }
                            } message: {
                                Text("Shield thought it was a scam or junk. If it asks you to call a number back, use a number you already know instead.")
                            }
                            if let until = voicemail.restorableUntil {
                                Text("You can restore it until \(until.formatted(date: .abbreviated, time: .shortened)).")
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                        } else if !voicemail.isRestorable {
                            Text("The recording has been deleted.").font(.subheadline).foregroundStyle(.secondary)
                        }
                    } else if !model.canListen {
                        Label("Voicemail isn’t shared", systemImage: "lock")
                    } else {
                        Label(model.isDemo ? "Sample message · no recording" : voicemail.status == "pending" ? "Message is processing" : "Recording unavailable",
                              systemImage: "waveform")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            Section("Next step") {
                Text(call.nextStep)
                if model.isOwner {
                    NavigationLink(value: AppRoute.savedNumbers) {
                        Label("Use a saved number", systemImage: "phone.arrow.up.right")
                    }
                }
                NavigationLink(value: AppRoute.help) { Label("Get help", systemImage: "lifepreserver") }
            }
            if !events.isEmpty {
                Section("Call timeline") {
                    ForEach(events) { event in
                        HStack(alignment: .top) {
                            Text(event.label)
                            Spacer()
                            Text(event.at, style: .time).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Call details")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .onAppear { isVisible = true }
        .onDisappear { isVisible = false; player.stop() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { player.stop() } }
        .scrollContentBackground(.hidden)
        .background(ShieldTheme.surface)
    }

    private func load() async {
        guard !model.isPreview, let personID = model.selectedPersonID else { return }
        do {
            let response: APIResponses.CallDetail = try await model.api.send("/api/calls/\(initialCall.id)", participantID: personID)
            guard model.selectedPersonID == personID else { return }
            updatedCall = response.call
            events = response.events
        } catch { model.handle(error) }
    }

    private func togglePlayback(_ voicemail: Voicemail) async {
        if player.playing { player.stop(); return }
        guard let personID = model.selectedPersonID else { return }
        player.loading = true
        defer { player.loading = false }
        do {
            let data = try await model.api.data("/api/voicemails/\(voicemail.id)/audio", participantID: personID)
            guard model.selectedPersonID == personID else { return }
            guard isVisible, scenePhase == .active, model.signedIn else { return }
            try player.play(data: data)
            let _: APIResponses.Empty = try await model.api.send("/api/voicemails/\(voicemail.id)/heard", method: "POST", participantID: personID)
        } catch { model.handle(error) }
    }

    private func restore(_ voicemail: Voicemail) async {
        guard let personID = model.selectedPersonID else { return }
        restoring = true
        defer { restoring = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/voicemails/\(voicemail.id)/restore", method: "POST", participantID: personID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }

    private func delete(_ voicemail: Voicemail) async {
        player.stop()
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/voicemails/\(voicemail.id)", method: "DELETE", participantID: model.selectedPersonID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }
}

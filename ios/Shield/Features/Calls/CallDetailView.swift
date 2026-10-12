import SwiftUI

struct CallDetailView: View {
    let initialCall: CallRecord
    @Environment(AppState.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var updatedCall: CallRecord?
    @State private var events: [CallEvent] = []
    @State private var player = VoicePlayer()
    @State private var samplePlayer: SampleMessagePlayer?
    @State private var confirmDelete = false
    @State private var confirmRestore = false
    @State private var restoring = false
    @State private var isVisible = false
    private var call: CallRecord { updatedCall ?? initialCall }
    private var messageRemoved: Bool { call.voicemail?.status == "removed" }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(messageRemoved ? "Message removed" : CallPresentation.title(call))
                        .font(call.voicemail == nil || messageRemoved ? .title2.bold() : .headline)
                        .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                    if call.voicemail == nil, !CallPresentation.title(call).localizedCaseInsensitiveContains(call.outcome.label) {
                        OutcomeBadge(outcome: call.outcome)
                    }
                    if !messageRemoved {
                        Text(call.occurredAt, format: .dateTime.month(.abbreviated).day().hour().minute())
                            .foregroundStyle(ShieldTheme.secondaryText)
                    }
                    if messageRemoved {
                        Text("It seemed suspicious.")
                            .fixedSize(horizontal: false, vertical: true).padding(.top, 8)
                        if let voicemail = call.voicemail, voicemail.isRestorable {
                            if model.canListen, let until = voicemail.restorableUntil {
                                Text("Bring it back by \(until.formatted(.dateTime.month(.wide).day())).")
                                    .foregroundStyle(ShieldTheme.secondaryText)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        } else {
                            Text("This message is no longer available.").foregroundStyle(ShieldTheme.secondaryText)
                        }
                    }
                }.padding(.vertical, 8).fixedSize(horizontal: false, vertical: true)
            }
            if model.isDemo, model.canListen, call.voicemail != nil, call.voicemail?.status != "removed" {
                VoicemailPreviewCard(call: call)
            } else if let voicemail = call.voicemail, !messageRemoved {
                Section {
                    if voicemail.status == "ready", model.canListen {
                        Text(voicemail.durationLabel).foregroundStyle(ShieldTheme.secondaryText)
                        if model.isOwner {
                            Button("Delete message", role: .destructive) { confirmDelete = true }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                .confirmationDialog("Delete this message?", isPresented: $confirmDelete, titleVisibility: .visible) {
                                    Button("Delete message", role: .destructive) { Task { await delete(voicemail) } }
                                    Button("Keep message", role: .cancel) {}
                                } message: { Text("You won’t be able to listen to it again.") }
                        }
                    } else if !model.canListen {
                        Label("Voicemail is private", systemImage: "lock")
                        Text("This person hasn’t shared their messages with you.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                    } else {
                        Text(voicemail.status == "pending" ? "Your message is getting ready." : "This message can’t be played.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
            }
            if call.voicemail == nil {
                Section { Text(CallPresentation.explanation(call)) }
            }
            if !messageRemoved, call.outcome == .held || call.outcome == .verification {
                Section {
                    Text("Need to call back? Use a number you already know.")
                    if model.isOwner {
                        NavigationLink(value: AppRoute.savedNumbers) {
                            ActionRow(title: "Find a trusted number", symbol: "phone")
                        }
                    }
                }
            }
            Section {
                DisclosureGroup("More about this call") {
                    Text(PhoneDisplay.format(call.callerNumber)).textSelection(.enabled)
                    Text(call.detail).fixedSize(horizontal: false, vertical: true)
                    Text(call.nextStep).fixedSize(horizontal: false, vertical: true)
                    if call.monitored == true { Text("Shield checked the words while you talked.") }
                    Text("Shield can’t prove who called.").foregroundStyle(ShieldTheme.secondaryText)
                    if messageRemoved {
                        Text(call.occurredAt, format: .dateTime.month(.abbreviated).day().hour().minute())
                            .foregroundStyle(ShieldTheme.secondaryText)
                        Text("If you call back, use a number you already know.")
                        if model.isOwner {
                            NavigationLink("Find a trusted number", value: AppRoute.savedNumbers)
                        }
                    }
                    if !events.isEmpty {
                        ForEach(events) { event in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(event.label)
                                Text(event.at, style: .time).foregroundStyle(ShieldTheme.secondaryText)
                            }
                        }
                    }
                }
                NavigationLink(value: AppRoute.help) { ActionRow(title: "Get help", symbol: "questionmark.circle") }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if let voicemail = call.voicemail, messageRemoved, voicemail.isRestorable, model.canListen {
                Button { confirmRestore = true } label: {
                    ShieldActionLabel(title: restoring ? "Bringing it back…" : "Bring back message", isWorking: restoring)
                }
                .shieldPrimaryButton().disabled(restoring || model.isDemo)
                .accessibilityIdentifier("restore-voicemail")
                .padding(16).background(ShieldTheme.surface)
                .confirmationDialog("Bring back this message?", isPresented: $confirmRestore, titleVisibility: .visible) {
                    Button("Bring back message") { Task { await restore(voicemail) } }
                } message: { Text("Don’t call a number from the message. Use one you already know.") }
            }
            if let voicemail = call.voicemail, model.canListen, voicemail.status != "removed" {
                if model.isDemo {
                    Button { toggleSample() } label: {
                        ShieldActionLabel(title: samplePlayer?.playing == true ? "Stop sample" : "Hear sample message")
                    }
                    .shieldPrimaryButton().padding(16).background(ShieldTheme.surface)
                } else if voicemail.status == "ready" {
                    Button { Task { await togglePlayback(voicemail) } } label: {
                        ShieldActionLabel(title: player.loading ? "Getting message…" : player.playing ? "Stop message" : "Listen to message", isWorking: player.loading)
                    }
                    .shieldPrimaryButton().disabled(player.loading).padding(16).background(ShieldTheme.surface)
                }
            }
        }
        .navigationTitle(call.voicemail == nil ? "Call" : "Voicemail")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .onAppear { isVisible = true }
        .onDisappear { isVisible = false; player.stop(); samplePlayer?.stop() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { player.stop(); samplePlayer?.stop() } }
        .shieldListStyle()
    }

    private func toggleSample() {
        if samplePlayer?.playing == true { samplePlayer?.stop(); return }
        let speaker = samplePlayer ?? SampleMessagePlayer()
        samplePlayer = speaker
        speaker.play(VoicemailPreview.message(for: call))
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

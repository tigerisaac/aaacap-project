import SwiftUI

struct CallDetailView: View {
    let initialCall: CallRecord
    @Environment(AppState.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOverEnabled
    @Environment(\.dismiss) private var dismiss
    @State private var updatedCall: CallRecord?
    @State private var events: [CallEvent] = []
    @State private var player = VoicePlayer()
    @State private var samplePlayer: SampleMessagePlayer?
    @State private var confirmDelete = false
    @State private var confirmRestore = false
    @State private var restoring = false
    @State private var isVisible = false
    @State private var deleting = false
    @State private var loadError: String?
    @State private var playbackError: String?
    @State private var showingPlaybackError = false
    @State private var loadingDetails = false
    @State private var playedStatusFailed = false
    @State private var playbackActionsInProgress = false
    @AccessibilityFocusState private var playedStatusFocused: Bool
    @State private var updatingPlayedStatus = false
    @State private var playbackRequest = UUID()
    private var call: CallRecord { updatedCall ?? initialCall }
    private var callerNumber: String { PhoneDisplay.format(call.callerNumber) }
    private var messageRemoved: Bool { call.voicemail?.status == "removed" }
    private var usesAudioFixture: Bool { PreviewScenario.requested("audio", preview: model.isPreview) }

    var body: some View {
        ScrollViewReader { proxy in
        List {
            if let loadError {
                ShieldGroup { ShieldLoadFailure(title: "Call details couldn’t update", detail: loadError) { Task { await load() } } }
            }
            ShieldPageHeader {
                // Headline and outcome, then what happened with who and when: one short article top.
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(messageRemoved ? "Message removed" : CallPresentation.title(call))
                            .shieldHeading(.title).foregroundStyle(ShieldTheme.ink)
                            .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                        if call.voicemail == nil, !CallPresentation.title(call).localizedCaseInsensitiveContains(call.outcome.label) {
                            OutcomeBadge(outcome: call.outcome)
                        }
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        if call.voicemail == nil {
                            Text(CallPresentation.explanation(call)).foregroundStyle(ShieldTheme.ink)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        MetadataLine.joined([
                            CallPresentation.title(call) == callerNumber ? nil : Text(PhoneDisplay.unbroken(callerNumber)),
                            Text(call.occurredAt, format: .dateTime.month(.abbreviated).day().hour().minute())
                        ])
                        .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        // Not selectable: on iOS 26 a selectable line is an 18-point touch target,
                        // and Shield asks people not to reuse a caller's number anyway.
                    }
                }.padding(.top, 2).padding(.bottom, 4).fixedSize(horizontal: false, vertical: true)
            }
            if messageRemoved {
                ShieldGroup {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("It seemed suspicious.")
                            .fixedSize(horizontal: false, vertical: true)
                        if let voicemail = call.voicemail, voicemail.isRestorable {
                            if model.canListen, let until = voicemail.restorableUntil {
                                Text("Bring it back by \(until.formatted(.dateTime.month(.wide).day())).")
                                    .foregroundStyle(ShieldTheme.secondaryText)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        } else {
                            Text("This message is no longer available.").foregroundStyle(ShieldTheme.secondaryText)
                        }
                    }.padding(.vertical, 8)
                }
            }
            if inlineMessageActions, hasMessageAction, !playbackActionsInProgress {
                messageActions().listRowInsets(EdgeInsets()).listRowBackground(ShieldTheme.surface)
            }
            if let message = call.voicemail, model.canListen, !messageRemoved {
                if let summary = message.summary {
                    if model.isDemo { VoicemailPreviewCard(call: call) }
                    else { ShieldGroup {
                        Text(summary).font(.title3).fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("message-summary")
                    } footer: {
                        Text("The caller’s claims haven’t been verified.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    } }
                }
                if message.summary == nil, message.status == "ready" {
                    ShieldGroup { Text("A summary isn’t available for this message. You can still listen.")
                        .foregroundStyle(ShieldTheme.secondaryText) }
                }
                if message.isNotice {
                    ShieldGroup {
                        Text("For account alerts, check the organization’s app or use a number from your card, statement or saved contacts.")
                            .fixedSize(horizontal: false, vertical: true)
                        if model.isOwner { NavigationLink("Find a trusted number", value: AppRoute.savedNumbers) }
                    }
                }
            }
            if model.isDemo, model.canListen, call.voicemail != nil, call.voicemail?.summary == nil, call.voicemail?.status != "removed" {
                VoicemailPreviewCard(call: call)
            } else if let voicemail = call.voicemail, !messageRemoved, !model.isDemo || !model.canListen || usesAudioFixture {
                ShieldGroup {
                    if voicemail.status == "ready", model.canListen {
                        LabeledContent("Length", value: voicemail.durationLabel)
                        if !model.isDemo {
                            Text(model.localMessages.contains { $0.call.id == call.id } ? "Saved on this iPhone"
                                : voicemail.audioDeliveredAt != nil ? "Saved on another phone. There is no cloud copy."
                                : voicemail.audioExpiredAt != nil || (voicemail.audioExpiresAt.map { $0 <= .now } ?? false) ? "The audio expired before it reached this iPhone."
                                : "Audio is available for delivery for up to 24 hours after the call.")
                                .foregroundStyle(ShieldTheme.secondaryText)
                        }
                        if player.hasAudio {
                            MessagePlaybackProgress(player: player) {
                                Task {
                                    do { try await player.restart() }
                                    catch is CancellationError { return }
                                    catch { playbackError = error.localizedDescription }
                                }
                            }
                        }
                        if playedStatusFailed || playbackActionsInProgress {
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                                if playedStatusFailed {
                                    Text("You can listen. It may still show as new.")
                                        .foregroundStyle(ShieldTheme.secondaryText)
                                        .fixedSize(horizontal: false, vertical: true)
                                        .accessibilityFocused($playedStatusFocused)
                                }
                                if inlineMessageActions, playbackActionsInProgress {
                                    messageActions(on: ShieldTheme.card)
                                }
                            }.id("played-status-feedback")
                        }
                        if playedStatusFailed {
                            Button(updatingPlayedStatus ? "Saving…" : "Mark as listened") {
                                Task { await markPlayed(voicemail) }
                            }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .disabled(updatingPlayedStatus)
                        }
                        ShieldDisclosure("Can’t hear the message?") {
                            Text("Turn up the volume with the buttons on the side of your iPhone.")
                                .foregroundStyle(ShieldTheme.secondaryText)
                        }
                        if model.isOwner {
                            Button(deleting ? "Deleting…" : "Delete message", role: .destructive) { confirmDelete = true }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                .disabled(deleting || model.isDemo)
                                .alert("Delete this message?", isPresented: $confirmDelete) {
                                    Button("Delete message", role: .destructive) { Task { await delete(voicemail) } }
                                    Button("Keep message", role: .cancel) {}
                                } message: { Text("You won’t be able to listen to it again.") }
                        }
                    } else if !model.canListen {
                        Label("Message is private", systemImage: "lock")
                        Text("This person hasn’t shared their messages with you.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                    } else {
                        Text(voicemail.status == "pending" ? "Your message is getting ready. You can come back later." : "This message can’t be played.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        if voicemail.status == "pending" {
                            Button(loadingDetails ? "Checking…" : "Check again") { Task { await load() } }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(loadingDetails)
                        }
                    }
                }
            }
            if !messageRemoved, call.outcome == .held || call.outcome == .verification {
                ShieldGroup {
                    Text("Need to call back? Use a number you already know.")
                    if model.isOwner {
                        NavigationLink(value: AppRoute.savedNumbers) {
                            ActionRow(title: "Find a trusted number", symbol: "phone")
                        }
                    }
                }
            }
            ShieldGroup {
                ShieldDisclosure("More about this call") {
                    Text(call.detail).fixedSize(horizontal: false, vertical: true)
                    Text(call.nextStep).fixedSize(horizontal: false, vertical: true)
                    if call.monitored == true { Text("Shield checked the words while you talked.") }
                    Text("Shield can’t prove who called.").foregroundStyle(ShieldTheme.secondaryText)
                    if messageRemoved {
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
        .shieldListStyle()
        // The page heading starts under the bar, not a full empty section below it.
        .contentMargins(.top, 0, for: .scrollContent)
        .safeAreaInset(edge: .bottom) {
            if !inlineMessageActions { messageActions() }
        }
        .navigationTitle(call.voicemail?.kindLabel ?? "Call")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .onChange(of: playbackError) { _, error in if error != nil { showingPlaybackError = true } }
        .onChange(of: player.failure) { _, error in if let error { playbackError = error } }
        .alert("Message couldn’t play", isPresented: $showingPlaybackError) {
            if let voicemail = call.voicemail {
                Button("Try again") { Task { await togglePlayback(voicemail) } }
            }
            Button("Cancel", role: .cancel) { playbackError = nil }
        } message: { Text(playbackError ?? "Please try again.") }
        .onAppear { isVisible = true }
        .onDisappear { isVisible = false; stopPlayback() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { stopPlayback() } }
        .onChange(of: model.selectedPersonID) { _, _ in stopPlayback(); dismiss() }
        .onChange(of: model.canListen) { _, canListen in
            if !canListen { stopPlayback() }
        }
        .onChange(of: playedStatusFailed) { _, failed in
            if failed {
                proxy.scrollTo("played-status-feedback", anchor: .bottom)
                playedStatusFocused = true
            }
        }
        }
    }

    private var inlineMessageActions: Bool { typeSize.isAccessibilitySize || voiceOverEnabled }

    private var hasMessageAction: Bool {
        guard let voicemail = call.voicemail, model.canListen else { return false }
        if messageRemoved { return voicemail.isRestorable }
        return (model.isDemo && !usesAudioFixture) || voicemail.status == "ready"
    }

    private func messageActions(on background: Color = ShieldTheme.surface) -> some View {
        VStack(spacing: 0) {
            if let voicemail = call.voicemail, messageRemoved, voicemail.isRestorable, model.canListen {
                Button { confirmRestore = true } label: {
                    ShieldActionLabel(title: restoring ? "Bringing it back…" : "Bring back message", isWorking: restoring)
                }
                .shieldPrimaryButton().disabled(restoring || model.isDemo)
                .accessibilityIdentifier("restore-voicemail")
                .padding(16).background(background)
                .alert("Bring back this message?", isPresented: $confirmRestore) {
                    Button("Bring back message") { Task { await restore(voicemail) } }
                    Button("Cancel", role: .cancel) {}
                } message: { Text("Don’t call a number from the message. Use one you already know.") }
            }
            if let voicemail = call.voicemail, model.canListen, voicemail.status != "removed" {
                if model.isDemo && !usesAudioFixture {
                    Button { toggleSample() } label: {
                        ShieldActionLabel(title: samplePlayer?.playing == true ? "Stop sample" : "Hear sample message")
                    }
                    .shieldPrimaryButton().padding(16).background(background)
                } else if voicemail.status == "ready" {
                    Button { Task { await togglePlayback(voicemail) } } label: {
                        ShieldActionLabel(title: player.loading ? "Getting message…" : player.playing ? "Pause message" : player.paused ? "Resume message" : "Listen to message", isWorking: player.loading)
                    }
                    .shieldPrimaryButton().disabled(player.loading).padding(16).background(background)
                }
            }
        }
        .accessibilityIdentifier(inlineMessageActions ? "message-inline-action-area" : "message-action-area")
    }

    private func toggleSample() {
        if samplePlayer?.playing == true { samplePlayer?.stop(); return }
        let speaker = samplePlayer ?? SampleMessagePlayer()
        samplePlayer = speaker
        speaker.play(VoicemailPreview.message(for: call))
    }

    private func stopPlayback() {
        playbackRequest = UUID()
        player.stop()
        samplePlayer?.stop()
    }

    private func load() async {
        loadError = nil
        guard !model.isPreview, let personID = model.selectedPersonID else { return }
        loadingDetails = true
        defer { loadingDetails = false }
        do {
            let response: APIResponses.CallDetail = try await model.api.send("/api/calls/\(initialCall.id)", participantID: personID)
            guard model.selectedPersonID == personID else { return }
            updatedCall = response.call
            events = response.events
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }

    private func togglePlayback(_ voicemail: Voicemail) async {
        guard isVisible, scenePhase == .active, model.signedIn, model.canListen, !player.loading else { return }
        playbackError = nil
        if player.playing { player.pause(); return }
        if player.paused {
            do { try await player.resume() }
            catch is CancellationError { return }
            catch { playbackError = error.localizedDescription }
            return
        }
        guard let personID = model.selectedPersonID, !model.isPreview || usesAudioFixture else { return }
        let request = UUID()
        playbackRequest = request
        do {
            player.loading = true
            defer { if playbackRequest == request { player.loading = false } }
            let data = try await playbackAudio()
            guard playbackRequest == request, model.selectedPersonID == personID else { return }
            guard isVisible, scenePhase == .active, model.signedIn, model.canListen else { return }
            try await player.play(data: data)
        } catch is CancellationError { return }
        catch {
            guard playbackRequest == request else { return }
            playbackError = error.localizedDescription
            model.handleSessionFailure(error)
            return
        }
        await markPlayed(voicemail)
    }

    private func playbackAudio() async throws -> Data {
        #if DEBUG && targetEnvironment(simulator)
        if usesAudioFixture {
            if ProcessInfo.processInfo.arguments.contains("--uitesting-delayed-audio") { try await Task.sleep(for: .seconds(4)) }
            return PreviewAudio.data
        }
        #endif
        // The same local-first path runs on physical devices and in the simulator.
        guard let person = model.person else { throw CancellationError() }
        return try await model.messageAudioData(call: call, person: person)
    }

    private func markPlayed(_ voicemail: Voicemail) async {
        guard model.canListen, model.signedIn, let personID = model.selectedPersonID, !updatingPlayedStatus else { return }
        updatingPlayedStatus = true
        defer { updatingPlayedStatus = false }
        do {
            #if DEBUG && targetEnvironment(simulator)
            if usesAudioFixture {
                if ProcessInfo.processInfo.arguments.contains("--uitesting-played-status-fails") {
                    try await Task.sleep(for: .seconds(1))
                    throw APIError.invalidResponse
                }
                playedStatusFailed = false
                return
            }
            #endif
            let _: APIResponses.Empty = try await model.api.send("/api/voicemails/\(voicemail.id)/heard", method: "POST", participantID: personID)
            guard model.selectedPersonID == personID else { return }
            playedStatusFailed = false
        } catch is CancellationError { return }
        catch {
            guard model.selectedPersonID == personID else { return }
            model.handleSessionFailure(error)
            if case let APIError.service(_, status) = error, status == 401 || status == 403 {
                stopPlayback()
                playedStatusFailed = false
                return
            }
            let failed = model.signedIn && model.canListen
            if failed && inlineMessageActions { playbackActionsInProgress = true }
            playedStatusFailed = failed
        }
    }

    private func restore(_ voicemail: Voicemail) async {
        guard let personID = model.selectedPersonID, !model.isPreview, !model.isDemo, !restoring else { return }
        restoring = true
        defer { restoring = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/voicemails/\(voicemail.id)/restore", method: "POST", participantID: personID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }

    private func delete(_ voicemail: Voicemail) async {
        guard !model.isPreview, !model.isDemo, !deleting else { return }
        deleting = true
        defer { deleting = false }
        stopPlayback()
        do {
            guard let personID = model.selectedPersonID else { return }
            try await model.deleteMessage(voicemail.id, personID: personID)
            await model.loadContext()
            dismiss()
        } catch { model.handle(error) }
    }
}

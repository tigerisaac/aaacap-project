import SwiftUI

struct SetupView: View {
    @Environment(AppState.self) private var model
    @State private var setup: SetupStatus?
    @State private var working = false
    @State private var contactSaved = false
    @State private var confirmConsent = false
    @State private var confirmRestore = false
    @State private var confirmDeletion = false
    @State private var confirmPause = false
    @State private var loadError: String?
    @State private var loading = true
    @State private var loadAttempts = 0
    private var usesFixture: Bool { PreviewScenario.requested("setup-details", preview: model.isPreview) || PreviewScenario.requested("trial-options", preview: model.isPreview) }

    var body: some View {
        Form {
            if let loadError {
                ShieldGroup {
                    ShieldLoadFailure(title: "Phone setup couldn’t load", detail: loadError) { Task { await load() } }
                }
            }
            if model.isPreview && !usesFixture {
                ShieldGroup {
                    Text("Phone setup is done with a helper, one step at a time.")
                    Text("The sample app doesn’t change your phone.").foregroundStyle(ShieldTheme.secondaryText)
                }
            } else if let setup, setup.isTrial == true {
                TrialSetupView(setup: setup, reload: load)
            } else if let setup {
                ShieldGroup {
                    LabeledContent("My number", value: PhoneDisplay.format(setup.phone))
                    Button(contactSaved ? "Shield contact saved" : "Save Shield in Contacts", systemImage: contactSaved ? "checkmark" : "person.crop.circle.badge.plus") {
                        Task { await saveContact(setup.shieldNumber) }
                    }.disabled(working || contactSaved || model.isDemo)
                }
                ShieldSection("Phone check") {
                    Label(setup.phoneVerified ? "Your phone has been checked" : "Your phone needs a check", systemImage: setup.phoneVerified ? "checkmark.circle" : "phone")
                    if !setup.consented {
                        Button("Agree to use Shield") { confirmConsent = true }
                            .disabled(working || model.isDemo)
                            .alert("Use Shield to check calls?", isPresented: $confirmConsent) {
                                Button("I agree") { Task { await consent(setup) } }
                                Button("Not now", role: .cancel) {}
                            } message: {
                                Text("Your phone sends some calls to Shield. The caller’s words go to our phone and AI providers for a scam check. Shield captures messages from the start and saves voicemail and potentially useful notices with playable audio and a short summary. Full transcripts aren’t saved. Answered calls and clear scams aren’t saved. Calls and messages expire within 30 days. See Privacy for details.")
                            }
                    }
                    if let date = setup.lastTestAt { Text("Last checked \(date.formatted(date: .abbreviated, time: .omitted))") }
                    if let profile = setup.carrierProfile {
                        DisclosureGroup("Phone setup instructions") {
                            Text(profile.configuration)
                            ForEach(Array(profile.activationSteps.enumerated()), id: \.offset) { index, step in
                                Text("\(index + 1). \(step)").textSelection(.enabled)
                            }
                            Text("Go through these steps with your helper.").foregroundStyle(ShieldTheme.secondaryText)
                        }
                    } else { Text("Ask your helper to finish phone setup.") }
                    if ["active", "paused"].contains(setup.status) {
                        Button(setup.status == "paused" ? "Resume calls from Shield" : "Pause calls from Shield") { confirmPause = true }
                            .disabled(working || model.isDemo)
                            .alert(setup.status == "paused" ? "Resume calls?" : "Pause calls?", isPresented: $confirmPause) {
                                Button(setup.status == "paused" ? "Resume calls" : "Pause calls") { Task { await pause(setup.status != "paused") } }
                                Button("Cancel", role: .cancel) {}
                            } message: { Text("While paused, calls that reach Shield go to voicemail. Your phone still sends those calls to Shield.") }
                    }
                }
                ShieldGroup {
                    if setup.status == "restoring" {
                        Text("Finish bringing back ordinary calls.").font(.headline)
                        if let steps = setup.carrierProfile?.restorationSteps {
                            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in Text("\(index + 1). \(step)").textSelection(.enabled) }
                        }
                    }
                    Button("Disconnect Shield", systemImage: "arrow.uturn.backward") { confirmRestore = true }
                        .disabled(model.isDemo || working || setup.status == "restoring")
                        .alert("Disconnect Shield?", isPresented: $confirmRestore) {
                            Button("Start disconnecting") { Task { await requestRestoration(deleting: false) } }
                            Button("Cancel", role: .cancel) {}
                        } message: { Text("Shield stops ringing you. Ask your helper to finish restoring ordinary calls and voicemail. Keep the app until both work.") }
                    if let email = setup.supportEmail, let url = URL(string: "mailto:\(email)") { Link("Ask for setup help", destination: url) }
                    DisclosureGroup("Delete my account") {
                        Button("Delete my account", role: .destructive) { confirmDeletion = true }
                            .disabled(model.isDemo || working)
                            .alert("Delete your account?", isPresented: $confirmDeletion) {
                                Button("Request deletion", role: .destructive) { Task { await requestRestoration(deleting: true) } }
                                Button("Keep my account", role: .cancel) {}
                            } message: { Text("First, your helper must bring back ordinary calls. Then your Shield information can be deleted.") }
                    }
                } footer: { Text("Deleting the app alone won’t disconnect Shield.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText) }
            } else if loading { ShieldGroup { ShieldLoadingView(title: "Getting your phone setup…") } }
        }
        .shieldListStyle()
        .navigationTitle("Phone setup").navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        loading = true
        loadError = nil
        defer { loading = false }
        #if DEBUG && targetEnvironment(simulator)
        if usesFixture {
            setup = PreviewSetupStatus.make(trial: PreviewScenario.requested("trial-options", preview: model.isPreview))
            return
        }
        #endif
        if let failure = PreviewScenario.loadFailure("setup", attempt: loadAttempts, preview: model.isPreview) {
            loadAttempts += 1
            loadError = failure
            return
        }
        guard !model.isPreview, let person = model.selectedPersonID else { return }
        let session = model.sessionGeneration
        do {
            let response: SetupStatus = try await model.api.send("/api/setup", participantID: person)
            guard model.selectedPersonID == person, model.sessionGeneration == session else { return }
            setup = response
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }
    private func saveContact(_ number: String) async {
        guard !model.isPreview, !model.isDemo, !working else { return }
        working = true
        defer { working = false }
        do { try await SaveShieldContact.save(number: number); contactSaved = true }
        catch { model.handle(error) }
    }
    private func consent(_ setup: SetupStatus) async {
        guard !model.isPreview, !model.isDemo, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/setup/consent", method: "POST",
                body: APIClient.payload(["version": setup.consentVersion, "accepted": true]), participantID: model.selectedPersonID)
            await load()
        } catch { model.handle(error) }
    }
    private func pause(_ paused: Bool) async {
        guard !model.isPreview, !model.isDemo, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/setup/pause", method: "POST",
                body: APIClient.payload(["paused": paused]), participantID: model.selectedPersonID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }
    private func requestRestoration(deleting: Bool) async {
        guard !model.isPreview, !model.isDemo, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send(deleting ? "/api/account/delete" : "/api/setup/restore",
                method: "POST", participantID: model.selectedPersonID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }
}

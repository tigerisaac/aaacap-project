import SwiftUI

struct SetupView: View {
    @Environment(AppState.self) private var model
    @State private var setup: SetupStatus?
    @State private var working = false
    @State private var contactSaved = false
    @State private var confirmConsent = false
    @State private var confirmRestore = false
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
                    Button { Task { await saveContact(setup.shieldNumber) } } label: {
                        HStack {
                            Text(contactSaved ? "Shield contact saved" : "Save Shield in Contacts")
                            Spacer()
                            if contactSaved { Image(systemName: "checkmark").foregroundStyle(ShieldTheme.connected).accessibilityHidden(true) }
                        }
                    }.disabled(working || contactSaved || model.isDemo)
                }
                ShieldSection("Phone check") {
                    HStack(spacing: ShieldTheme.Spacing.regular) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(setup.phoneVerified ? "Your phone has been checked" : "Your phone needs a check")
                            if let date = setup.lastTestAt {
                                Text("Last checked \(date.formatted(date: .abbreviated, time: .omitted))")
                                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            }
                        }
                        .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                        Image(systemName: setup.phoneVerified ? "checkmark.circle.fill" : "exclamationmark.circle")
                            .font(.title3).foregroundStyle(setup.phoneVerified ? ShieldTheme.connected : ShieldTheme.held)
                            .accessibilityHidden(true)
                    }
                    .padding(.vertical, 4)
                    .accessibilityElement(children: .combine)
                    if !setup.consented {
                        Button("Agree to use Shield") { confirmConsent = true }
                            .disabled(working || model.isDemo)
                            .alert("Use Shield to check calls?", isPresented: $confirmConsent) {
                                Button("I agree") { Task { await consent(setup) } }
                                Button("Not now", role: .cancel) {}
                            } message: {
                                Text(PrivacyCopy.screeningProviders + " " + PrivacyCopy.messageRetention + " " + PrivacyCopy.screeningConsent)
                            }
                    }
                    if let profile = setup.carrierProfile {
                        ShieldDisclosure("Phone setup instructions") {
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
                    Button("Disconnect Shield") { confirmRestore = true }
                        .disabled(model.isDemo || working || setup.status == "restoring")
                        .alert("Disconnect Shield?", isPresented: $confirmRestore) {
                            Button("Start disconnecting") { Task { await requestRestoration() } }
                            Button("Cancel", role: .cancel) {}
                        } message: { Text("Shield stops ringing you. Ask your helper to finish restoring ordinary calls and voicemail. Keep the app until both work.") }
                    if let email = setup.supportEmail, let url = URL(string: "mailto:\(email)") { Link("Ask for setup help", destination: url) }
                    NavigationLink { DeleteAccountView() } label: {
                        ActionRow(title: "Delete account", symbol: "person.crop.circle.badge.minus")
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
    private func requestRestoration() async {
        guard !model.isPreview, !model.isDemo, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/setup/restore",
                method: "POST", participantID: model.selectedPersonID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }
}

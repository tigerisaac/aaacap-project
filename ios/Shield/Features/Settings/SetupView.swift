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

    var body: some View {
        Form {
            if model.isPreview {
                Section {
                    Label("Demo phone setup", systemImage: "phone.circle.fill")
                        .foregroundStyle(ShieldTheme.action).font(.headline)
                    Text("No phone settings have changed. Live setup is assisted and tested.")
                }
            } else if let setup, setup.isTrial == true {
                TrialSetupView(setup: setup, reload: load)
            } else if let setup {
                Section {
                    LabeledContent("Mobile", value: setup.phone)
                    LabeledContent("Shield", value: setup.shieldNumber)
                    Button(contactSaved ? "Shield contact saved" : "Save Shield to Contacts", systemImage: contactSaved ? "checkmark" : "person.crop.circle.badge.plus") {
                        Task { await saveContact(setup.shieldNumber) }
                    }
                    .disabled(working || contactSaved || model.isDemo)
                } header: { Text("Your numbers") } footer: {
                    Text("The saved contact helps callbacks ring. It does not prove who is calling.")
                }
                Section("Setup") {
                    if let until = setup.routingTestUntil, until > .now {
                        Label("Supervised test until \(until.formatted(date: .omitted, time: .shortened))", systemImage: "testtube.2")
                            .foregroundStyle(ShieldTheme.held)
                    }
                    Label(setup.phoneVerified ? "Phone ownership checked" : "Phone ownership check needed",
                          systemImage: setup.phoneVerified ? "checkmark.circle" : "circle")
                    Label(setup.consented ? "Service consent recorded" : "Review service consent",
                          systemImage: setup.consented ? "checkmark.circle" : "circle")
                    if !setup.consented {
                        Button("Review & agree") { confirmConsent = true }
                            .confirmationDialog("Use Shield call screening?", isPresented: $confirmConsent, titleVisibility: .visible) {
                                Button("I agree") { Task { await consent(setup) } }
                            } message: {
                                Text("Forwarded introductions are transcribed by the phone provider and sent to our AI screening provider. Shield replaces voicemail for forwarded calls. Call history and voicemail expire within 30 days. Review Privacy for the current providers, retention and how to leave.")
                            }
                    }
                    if let date = setup.lastTestAt {
                        LabeledContent("Last routing test", value: date.formatted(date: .abbreviated, time: .shortened))
                    } else {
                        Label("Routing test needed", systemImage: "phone.badge.checkmark")
                    }
                }
                if let profile = setup.carrierProfile {
                    Section {
                        Text(profile.configuration).font(.subheadline).foregroundStyle(.secondary)
                        ForEach(Array(profile.activationSteps.enumerated()), id: \.offset) { index, step in
                            HStack(alignment: .top, spacing: 12) {
                                Text(index + 1, format: .number).font(.headline).foregroundStyle(ShieldTheme.action)
                                Text(step).textSelection(.enabled)
                            }
                        }
                    } header: { Text(profile.name) } footer: {
                        Text("Use these instructions with your setup helper. Carrier codes must be entered in Phone.")
                    }
                } else {
                    Section {
                        Label("Assisted setup needed", systemImage: "person.crop.circle.badge.questionmark")
                        Text("Your support person will match your carrier and phone to a tested setup.")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                if ["active", "paused"].contains(setup.status) {
                    Section {
                        Button(setup.status == "paused" ? "Resume call offers" : "Pause call offers",
                               systemImage: setup.status == "paused" ? "play.circle" : "pause.circle") { confirmPause = true }
                            .disabled(working || model.isDemo)
                            .confirmationDialog(setup.status == "paused" ? "Resume call offers?" : "Pause call offers?",
                                                isPresented: $confirmPause, titleVisibility: .visible) {
                                Button(setup.status == "paused" ? "Resume offers" : "Pause offers") {
                                    Task { await pause(setup.status != "paused") }
                                }
                            } message: {
                                Text("Pausing sends forwarded calls to voicemail. It does not restore your carrier’s routing.")
                            }
                    }
                }
                Section {
                    if setup.status == "restoring" {
                        Label("Restoration requested", systemImage: "arrow.uturn.backward.circle.fill")
                            .foregroundStyle(ShieldTheme.held)
                    }
                    if let steps = setup.carrierProfile?.restorationSteps {
                        ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                            Text("\(index + 1). \(step)").textSelection(.enabled)
                        }
                    }
                    Button("Request restoration", systemImage: "arrow.uturn.backward") { confirmRestore = true }
                        .disabled(model.isDemo || working || setup.status == "restoring")
                        .confirmationDialog("Restore ordinary phone service?", isPresented: $confirmRestore, titleVisibility: .visible) {
                            Button("Request restoration") { Task { await requestRestoration(deleting: false) } }
                        } message: {
                            Text("Offers pause immediately. Your support person must help restore carrier forwarding and verify calls and voicemail.")
                        }
                    if let email = setup.supportEmail, let url = URL(string: "mailto:\(email)") { Link("Contact support", destination: url) }
                } header: { Text("Restore your phone") } footer: {
                    Text("Keep Shield installed until restoration is confirmed. Deleting the app does not undo forwarding.")
                }
                Section {
                    Button("Delete my account", role: .destructive) { confirmDeletion = true }
                        .disabled(model.isDemo || working)
                        .confirmationDialog("Request account deletion?", isPresented: $confirmDeletion, titleVisibility: .visible) {
                            Button("Request deletion", role: .destructive) { Task { await requestRestoration(deleting: true) } }
                        } message: {
                            Text("We first restore call routing so your calls aren’t lost, then remove account data under the privacy policy.")
                        }
                }
            } else {
                ProgressView("Loading setup…")
            }
        }
        .navigationTitle("Phone setup")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        guard !model.isPreview else { return }
        do { setup = try await model.api.send("/api/setup", participantID: model.selectedPersonID) }
        catch { model.handle(error) }
    }
    private func saveContact(_ number: String) async {
        working = true
        defer { working = false }
        do { try await SaveShieldContact.save(number: number); contactSaved = true }
        catch { model.handle(error) }
    }
    private func consent(_ setup: SetupStatus) async {
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/setup/consent", method: "POST",
                body: APIClient.payload(["version": setup.consentVersion, "accepted": true]), participantID: model.selectedPersonID)
            await load()
        } catch { model.handle(error) }
    }
    private func pause(_ paused: Bool) async {
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/setup/pause", method: "POST",
                body: APIClient.payload(["paused": paused]), participantID: model.selectedPersonID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }
    private func requestRestoration(deleting: Bool) async {
        do {
            let _: APIResponses.Empty = try await model.api.send(deleting ? "/api/account/delete" : "/api/setup/restore",
                method: "POST", participantID: model.selectedPersonID)
            await load()
            await model.loadContext()
        } catch { model.handle(error) }
    }
}

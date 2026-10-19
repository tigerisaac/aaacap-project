import SwiftUI

struct PublicEnrollmentView: View {
    @Environment(AppState.self) private var app
    @State private var status: PublicEnrollmentStatus?
    @State private var name = ""
    @State private var carrier = ""
    @State private var unanswered = ""
    @State private var busy = ""
    @State private var unreachable = ""
    @State private var dataPlan = false
    @State private var originalSettings = false
    @State private var consent = false
    @State private var requestID = UUID()
    @State private var working = false
    @State private var loadRevision = 0
    @State private var requestUnconfirmed = false
    @State private var error: String?

    private var instructions: [String] {
        [unanswered, busy, unreachable].map { $0.split(whereSeparator: \.isWhitespace).joined(separator: " ") }
    }
    private var canSave: Bool {
        !working && !requestUnconfirmed && status?.status == "available"
            && ContactName.problem(name, disallowControls: true) == nil
            && status?.carriers.contains(where: { $0.id == carrier }) == true
            && instructions.allSatisfy { (10...1000).contains($0.count) }
            && dataPlan && originalSettings && consent
    }

    var body: some View {
        List {
            if let status {
                if status.status == "enrolled" {
                    ShieldSection("Phone setup saved") {
                        Text("Your phone is registered for setup. Protection starts only after access and phone checks are complete.")
                        Text("Check your access here, then open your account and choose Phone setup from Home.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        NavigationLink { SubscriptionView() } label: {
                            ActionRow(title: "Check Shield access", symbol: "checkmark.shield")
                        }
                        Button { Task { await continueSetup(status.participantId) } } label: {
                            ShieldActionLabel(title: "Open my account", isWorking: working)
                        }.shieldPrimaryButton().disabled(working)
                    }
                } else if status.status == "available" {
                    enrollmentForm(status)
                } else {
                    ShieldSection("Phone setup isn’t available yet") {
                        Text(status.unavailableMessage)
                        Button("Check again") { Task { await load() } }.disabled(working)
                    }
                }
                if let url = URL(string: "mailto:\(status.supportEmail)") {
                    ShieldGroup { Link("Contact Shield", destination: url) }
                }
            } else if error == nil {
                ShieldGroup { ShieldLoadingView(title: "Checking phone availability…") }
            }
            if let error {
                ShieldGroup {
                    ShieldNotice(title: requestUnconfirmed ? "Setup not confirmed" : "Setup couldn’t continue",
                        detail: error, symbol: "exclamationmark.circle")
                    Button("Check current status") { Task { await load() } }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(working)
                }
            }
        }
        .shieldListStyle().navigationTitle("Connect my phone").navigationBarTitleDisplayMode(.inline)
        .scrollDismissesKeyboard(.interactively)
        .task { await load() }
        .refreshable { await load() }
    }

    @ViewBuilder private func enrollmentForm(_ status: PublicEnrollmentStatus) -> some View {
        ShieldSection("Your phone") {
            Text(PhoneDisplay.format(status.phone)).monospacedDigit()
            Text("This is the number you verified when signing in. To protect another number, sign in with that number.")
                .foregroundStyle(ShieldTheme.secondaryText)
            TextField("Your name", text: $name).textContentType(.name)
            Picker("Carrier", selection: $carrier) {
                Text("Choose your carrier").tag("")
                ForEach(status.carriers) { Text($0.name).tag($0.id) }
            }
            Toggle("My plan includes mobile data", isOn: $dataPlan)
        }.disabled(working || requestUnconfirmed)
        ShieldSection("Save your current carrier settings") {
            Text("Before changing forwarding, ask your carrier how to restore your current voicemail or forwarding for each situation. Save their instructions below. Don’t guess reset codes.")
            TextField("Restore unanswered calls", text: $unanswered, axis: .vertical).lineLimit(3...8)
            TextField("Restore busy calls", text: $busy, axis: .vertical).lineLimit(3...8)
            TextField("Restore calls with no signal", text: $unreachable, axis: .vertical).lineLimit(3...8)
            Toggle("These instructions restore my original settings", isOn: $originalSettings)
            Text("Use 10–1,000 characters for each instruction. Shield saves them privately with your setup.")
                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
        }.disabled(working || requestUnconfirmed)
        ShieldSection("Before continuing") {
            Text("Creating setup does not start a subscription or change forwarding. A subscription and separate phone checks are required before protection starts.")
            if let base = app.configuration.baseURL {
                Link("Privacy", destination: base.appending(path: "privacy"))
                Link("How Shield works", destination: base.appending(path: "service-info"))
            }
            Toggle("I agree to Shield storing these details for my setup", isOn: $consent)
                .disabled(working || requestUnconfirmed)
            Button { Task { await save(status) } } label: {
                ShieldActionLabel(title: "Save phone setup", isWorking: working)
            }.shieldPrimaryButton().disabled(!canSave)
        }
    }

    private func load() async {
        guard !working, app.signedIn, !app.isPreview else { return }
        loadRevision += 1
        let revision = loadRevision, generation = app.sessionGeneration
        working = true; error = nil
        defer { if revision == loadRevision { working = false } }
        do {
            let value: PublicEnrollmentStatus = try await app.api.send("/api/enrollment")
            guard generation == app.sessionGeneration, revision == loadRevision else { return }
            status = value; requestUnconfirmed = false
        } catch is CancellationError { return }
        catch {
            guard generation == app.sessionGeneration, revision == loadRevision else { return }
            self.error = error.localizedDescription
            app.handleSessionFailure(error)
        }
    }

    private func save(_ status: PublicEnrollmentStatus) async {
        guard canSave, app.signedIn, !app.isPreview else { return }
        let generation = app.sessionGeneration
        loadRevision += 1; working = true; error = nil
        do {
            let _: APIResponses.Empty = try await app.api.send("/api/enrollment", method: "POST", body: APIClient.payload([
                "requestId": requestID.uuidString.lowercased(), "name": ContactName.cleaned(name), "carrier": carrier,
                "dataPlanConfirmed": dataPlan, "originalSettingsRecorded": originalSettings,
                "restorationInstructions": instructions, "consentVersion": status.consentVersion, "accepted": consent,
            ]))
            guard generation == app.sessionGeneration else { working = false; return }
            working = false
            await load()
        } catch {
            guard generation == app.sessionGeneration else { working = false; return }
            // Keep the submitted form until a current read establishes whether it saved.
            requestUnconfirmed = true; working = false
            self.error = "Your setup wasn’t confirmed. Check its current status before trying again. " + error.localizedDescription
            app.handleSessionFailure(error)
        }
    }

    private func continueSetup(_ id: UUID?) async {
        guard !working, app.signedIn, let id else { return }
        working = true; defer { working = false }
        app.selectedPersonID = id
        app.selectedTab = 0
        await app.refresh()
    }
}

import SwiftUI

/// Checks the verified number's carrier and creates inactive setup. Choosing a plan comes next;
/// original carrier settings are saved later, in phone setup, before anything is forwarded.
struct PublicEnrollmentView: View {
    @Environment(AppState.self) private var app
    var isFirstScreen = false
    @State private var status: PublicEnrollmentStatus?
    @State private var name = ""
    @State private var carrier = ""
    @State private var dataPlan = false
    @State private var consent = false
    @State private var requestID = UUID()
    @State private var working = false
    @State private var loadRevision = 0
    @State private var requestUnconfirmed = false
    @State private var error: String?

    private var canSave: Bool {
        !working && !requestUnconfirmed && status?.status == "available"
            && ContactName.problem(name, disallowControls: true) == nil
            && status?.carriers.contains(where: { $0.id == carrier }) == true
            && dataPlan && consent
    }

    var body: some View {
        List {
            if isFirstScreen {
                ShieldPageHeader {
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                        Text("Welcome to Shield").shieldPageHeading().accessibilityAddTraits(.isHeader)
                        Text(status?.status == "unavailable" ? "Your phone isn’t connected yet."
                             : "First, check that Shield works with your phone. Then choose a plan.")
                            .foregroundStyle(ShieldTheme.secondaryText).fixedSize(horizontal: false, vertical: true)
                    }.padding(.vertical, ShieldTheme.Spacing.compact)
                }
            }
            if let status {
                if status.status == "enrolled" {
                    ShieldSection("Your phone works with Shield") {
                        Text("Next, choose a plan. Protection starts after phone setup is complete.")
                        Button { Task { await continueSetup(status.participantId) } } label: {
                            ShieldActionLabel(title: "Continue", isWorking: working)
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
            if isFirstScreen { AccountActionsGroup(showsAccess: false) }
        }
        .shieldListStyle().navigationTitle(isFirstScreen ? "Get started" : "Connect my phone").navigationBarTitleDisplayMode(.inline)
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
        ShieldSection("Before continuing") {
            Text("Checking your phone doesn’t start a subscription or change any phone settings.")
            if let base = app.configuration.baseURL {
                Link("Privacy", destination: base.appending(path: "privacy"))
                Link("How Shield works", destination: base.appending(path: "service-info"))
            }
            Toggle("I agree to Shield storing these details for my setup", isOn: $consent)
                .disabled(working || requestUnconfirmed)
            Button { Task { await save(status) } } label: {
                ShieldActionLabel(title: "Check my phone", isWorking: working)
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
                "dataPlanConfirmed": dataPlan, "consentVersion": status.consentVersion, "accepted": consent,
            ]))
            guard generation == app.sessionGeneration else { working = false; return }
            working = false
            await load()
            // The new setup makes this a known account; the app now asks for a plan.
            if self.status?.status == "enrolled" { await continueSetup(self.status?.participantId) }
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

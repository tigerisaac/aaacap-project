import SwiftUI

struct SharedContactsView: View {
    @Environment(AppState.self) private var app
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL
    let demoAction: String?
    init(demoAction: String? = nil) { self.demoAction = demoAction }
    @State private var model = SharedContactsModel()
    @State private var search = ""
    @State private var loadingVisible = false
    @State private var showingAdd = false
    @State private var pendingRemoval: SavedNumber?
    @State private var confirmingKeepRemoved = false
    private var usesRemovalFixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        PreviewScenario.requested("contacts", preview: app.isPreview) && ProcessInfo.processInfo.arguments.contains("--uitesting-contact-removal")
        #else
        false
        #endif
    }
    private var filtered: [SavedNumber] {
        search.isEmpty ? model.items.filter(\.isEnabled) : model.items.filter(\.isEnabled).filter { $0.label.localizedStandardContains(search) || $0.phone.localizedStandardContains(search) }
    }

    var body: some View {
        List {
            if let pending = model.pending {
                ShieldGroup {
                    Text("Finish contact change").font(.headline).accessibilityAddTraits(.isHeader)
                    Text("You asked to \(pending.enabled ? "restore" : "remove") \(pending.item.label). Shield hasn’t confirmed that iPhone Contacts and your shared list agree.")
                        .fixedSize(horizontal: false, vertical: true)
                    if let error = model.recoveryError {
                        Text(error).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    }
                    Button("Check saved change", systemImage: "arrow.clockwise") { Task { await model.load(app) } }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
                        .accessibilityIdentifier("check-contact-change")
                    if model.missingPendingContact && pending.enabled {
                        Text("This contact is no longer on your shared list. Keep it removed to finish, then add it again if you choose.")
                            .font(.subheadline).fixedSize(horizontal: false, vertical: true)
                        Button("Keep number removed", role: .destructive) { confirmingKeepRemoved = true }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
                    } else {
                        Button(pending.enabled ? "Continue restoring contact" : "Continue removing contact") {
                            Task { await model.retry(app) }
                        }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
                        .accessibilityIdentifier("continue-contact-change")
                    }
                }
                .buttonStyle(.borderless)
            }
            ShieldGroup {
                Button { Task { await model.share(app) } } label: {
                    ActionRow(title: model.working ? "Updating contacts…" : model.hasShared(app.selectedPersonID) ? "Update shared contacts" : "Share contacts once", symbol: "person.2.badge.plus")
                }
                .disabled(!model.canEdit || app.isDemo)
                .accessibilityIdentifier("share-all-contacts")
                if let message = model.message { Text(message).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText) }
                if let sharedAt = model.sharedAt {
                    Text("Last shared \(sharedAt.formatted(date: .abbreviated, time: .shortened))")
                        .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                }
            } footer: {
                Text("Only names and numbers go to Shield. Contacts update only when you choose; there are no automatic uploads.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            if let error = model.loadError {
                ShieldGroup { ShieldLoadFailure(title: "Contacts couldn’t load", detail: error) { Task { await model.load(app) } } }
            } else if model.loading && model.items.isEmpty {
                if loadingVisible { ShieldGroup { ShieldLoadingView(title: "Getting your contacts…") } }
            } else if filtered.isEmpty {
                ShieldGroup {
                    if search.isEmpty {
                        ShieldEmptyState(title: "Your calling list is empty", symbol: "person.2",
                                         detail: "Share your contacts once, or add a contact with the Add button.")
                    } else {
                        ShieldEmptyState(title: "No matching contacts", symbol: "magnifyingglass",
                                         detail: "Try another name or number.")
                    }
                }
            }
            ShieldGroup {
                ForEach(filtered) { item in
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.tight) {
                        Text(item.label).font(.headline)
                        Text(PhoneDisplay.format(item.phone)).font(.subheadline).monospacedDigit().foregroundStyle(ShieldTheme.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.bottom, ShieldTheme.Spacing.compact)
                        // Red text, like Remove in Numbers you trust: a destructive choice per row shouldn't
                        // outweigh the name. Borderless, so the 52-point target lives in its label.
                        Button(role: .destructive) { pendingRemoval = item } label: {
                            Text("Remove from iPhone")
                                .fixedSize(horizontal: false, vertical: true)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                                .contentShape(.rect)
                        }
                        .buttonStyle(.borderless).disabled(!model.canEdit || (app.isDemo && !usesRemovalFixture))
                        .accessibilityLabel("Remove \(item.label) from Contacts")
                        .accessibilityInputLabels(["Remove from iPhone", "Remove \(item.label)"])
                    }
                    .padding(.vertical, ShieldTheme.Spacing.tight)
                }
            } footer: {
                Text("Removing a number here also removes it from iPhone Contacts.").foregroundStyle(ShieldTheme.secondaryText)
            }
            if model.items.contains(where: { !$0.isEnabled }) {
                ShieldGroup {
                    ShieldDisclosure("Removed contacts") {
                        ForEach(model.items.filter { !$0.isEnabled }) { item in
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                                Text(item.label).font(.headline)
                                // Borderless keeps a tap on the name from re-adding the contact.
                                Button {
                                    Task { _ = await model.change(true, item: item, app: app) }
                                } label: {
                                    Label("Add back to Contacts", systemImage: "arrow.uturn.backward")
                                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).contentShape(.rect)
                                }
                                .buttonStyle(.borderless).disabled(!model.canEdit || app.isDemo)
                                .accessibilityLabel("Add \(item.label) back to Contacts")
                            }
                        }
                    }
                }
            }
            ShieldGroup {
                Button("Contacts settings", systemImage: "gearshape") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
            }
        }
        .alert("Remove \(pendingRemoval?.label ?? "this contact") from iPhone Contacts?", isPresented: Binding(get: { pendingRemoval != nil }, set: { if !$0 { pendingRemoval = nil } })) {
            Button("Remove contact", role: .destructive) {
                if let item = pendingRemoval { Task { _ = await model.change(false, item: item, app: app); pendingRemoval = nil } }
            }
            Button("Keep contact", role: .cancel) { pendingRemoval = nil }
        } message: { Text("This can also remove the contact from your other devices through iCloud. A restore copy stays on this phone.") }
        .alert("Keep this number removed?", isPresented: $confirmingKeepRemoved) {
            Button("Keep number removed", role: .destructive) { Task { await model.retry(app, keepRemoved: true) } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Shield will remove the number from iPhone Contacts to match your shared list. This can also affect your other devices through iCloud. A restore copy stays on this phone.")
        }
        .navigationTitle("Your contacts")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, prompt: "Name or number")
        .toolbar { ToolbarItem(placement: .primaryAction) {
            Button("Add", systemImage: "plus") { showingAdd = true }
                .labelStyle(.titleAndIcon).accessibilityLabel("Add contact")
                .disabled(!model.canEdit || app.isDemo)
        } }
        .sheet(isPresented: $showingAdd, onDismiss: { Task { await model.load(app) } }) { AddNumberView(kind: .trusted) }
        .task(id: "\(app.sessionGeneration)-\(app.selectedPersonID?.uuidString ?? "none")-\(app.signedIn)-\(app.isOwner)") {
            pendingRemoval = nil; confirmingKeepRemoved = false; showingAdd = false
            await model.load(app)
            #if DEBUG
            if let demoAction, let phone = ProcessInfo.processInfo.environment["SHIELD_DEMO_CONTACT"] {
                await model.prepareDemo(demoAction, phone: phone, app: app)
            }
            #endif
        }
        .refreshable { await app.api.invalidateNavigationCache(); await model.load(app) }
        .onChange(of: scenePhase) { _, phase in
            // Preview data has no external changes to refresh. The launch activation
            // must not consume its simulated failure before the user can retry.
            if phase == .active, demoAction == nil, !app.isPreview { Task { await model.load(app) } }
        }
        .deferredLoading(model.loading && model.items.isEmpty, visible: $loadingVisible)
        .shieldListStyle()
    }
}

import SwiftUI

struct SharedContactsView: View {
    @Environment(AppState.self) private var app
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL
    let demoAction: String?
    init(demoAction: String? = nil) { self.demoAction = demoAction }
    @State private var model = SharedContactsModel()
    @State private var search = ""
    @State private var showingAdd = false
    @State private var pendingRemoval: SavedNumber?
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
            ShieldGroup {
                Button { Task { await model.share(app) } } label: {
                    ActionRow(title: model.working ? "Updating contacts…" : model.hasShared(app.selectedPersonID) ? "Update my contacts" : "Use my iPhone contacts", symbol: "person.2.badge.plus")
                }
                .disabled(model.working || app.isDemo)
                .accessibilityIdentifier("share-all-contacts")
                if let message = model.message { Text(message).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText) }
            } footer: {
                Text("Names and numbers go to Shield. Your saved contacts can ring you as usual.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            if let error = model.loadError {
                ShieldGroup { ShieldLoadFailure(title: "Contacts couldn’t load", detail: error) { Task { await model.load(app) } } }
            } else if model.loading && model.items.isEmpty {
                ShieldGroup { ShieldLoadingView(title: "Getting your contacts…") }
            } else if filtered.isEmpty {
                ShieldGroup {
                    if search.isEmpty {
                        ContentUnavailableView("Your calling list is empty", systemImage: "person.2",
                            description: Text("Use your iPhone contacts to let Shield know who you already know."))
                    } else {
                        ContentUnavailableView.search(text: search)
                    }
                }
            }
            ShieldGroup {
                ForEach(filtered) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.label).font(.headline)
                        Text(PhoneDisplay.format(item.phone)).font(.subheadline).monospacedDigit().foregroundStyle(ShieldTheme.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.bottom, 8)
                        Button(role: .destructive) { pendingRemoval = item } label: {
                            Label("Remove from iPhone", systemImage: "minus.circle")
                                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                                .contentShape(.rect)
                        }
                        .shieldSecondaryButton().tint(ShieldTheme.held)
                        .contentShape(.rect).disabled(model.working || (app.isDemo && !usesRemovalFixture))
                        .accessibilityLabel("Remove \(item.label) from Contacts")
                        .accessibilityInputLabels(["Remove from iPhone", "Remove \(item.label)"])
                    }
                    .padding(.vertical, 4)
                }
            } footer: {
                Text("Removing a number here also removes it from iPhone Contacts.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            if model.items.contains(where: { !$0.isEnabled }) {
                ShieldGroup {
                    ShieldDisclosure("Removed contacts") {
                        ForEach(model.items.filter { !$0.isEnabled }) { item in
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                                Text(item.label).font(.headline)
                                Button("Add back to Contacts", systemImage: "arrow.uturn.backward") {
                                    Task { _ = await model.change(true, item: item, app: app) }
                                }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working || app.isDemo)
                                .accessibilityLabel("Add \(item.label) back to Contacts")
                            }
                        }
                    }
                }
            }
            ShieldGroup {
                Button("Contacts settings", systemImage: "gearshape") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
            }
        }
        .alert("Remove \(pendingRemoval?.label ?? "this contact") from iPhone Contacts?", isPresented: Binding(get: { pendingRemoval != nil }, set: { if !$0 { pendingRemoval = nil } })) {
            Button("Remove contact", role: .destructive) {
                if let item = pendingRemoval { Task { _ = await model.change(false, item: item, app: app); pendingRemoval = nil } }
            }
            Button("Keep contact", role: .cancel) { pendingRemoval = nil }
        } message: { Text("This can also remove the contact from your other devices through iCloud. A restore copy stays on this phone.") }
        .navigationTitle("Your contacts")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, prompt: "Name or number")
        .toolbar { ToolbarItem(placement: .primaryAction) {
            Button("Add", systemImage: "plus") { showingAdd = true }
                .labelStyle(.titleAndIcon).accessibilityLabel("Add contact")
                .disabled(model.working || app.isDemo || !model.hasShared(app.selectedPersonID))
        } }
        .sheet(isPresented: $showingAdd, onDismiss: { Task { await model.load(app) } }) { AddNumberView(kind: .trusted) }
        .task {
            await model.load(app)
            #if DEBUG
            if let demoAction, let phone = ProcessInfo.processInfo.environment["SHIELD_DEMO_CONTACT"] {
                await model.prepareDemo(demoAction, phone: phone, app: app)
            }
            #endif
        }
        .refreshable { if model.hasShared(app.selectedPersonID) { await model.share(app) } else { await model.load(app) } }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active, demoAction == nil, model.hasShared(app.selectedPersonID) { Task { await model.share(app) } }
        }
        .shieldListStyle()
    }
}

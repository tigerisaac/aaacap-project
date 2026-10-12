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
    private var filtered: [SavedNumber] {
        search.isEmpty ? model.items.filter(\.isEnabled) : model.items.filter(\.isEnabled).filter { $0.label.localizedStandardContains(search) || $0.phone.localizedStandardContains(search) }
    }

    var body: some View {
        List {
            Section {
                Button { Task { await model.share(app) } } label: {
                    Label(model.working ? "Updating contacts…" : model.hasShared(app.selectedPersonID) ? "Update my contacts" : "Use my iPhone contacts", systemImage: "person.2.badge.plus")
                        .font(.headline).padding(.vertical, 8)
                }
                .disabled(model.working || app.isDemo)
                .accessibilityIdentifier("share-all-contacts")
                if let message = model.message { Text(message).font(.subheadline).foregroundStyle(.secondary) }
            } footer: {
                Text("Names and numbers go to Shield. Your saved contacts can ring you as usual.").foregroundStyle(ShieldTheme.secondaryText)
            }
            Section {
                ForEach(filtered) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.label).font(.headline)
                        Text(PhoneDisplay.format(item.phone)).font(.subheadline).foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                    .swipeActions {
                        Button("Remove", role: .destructive) { pendingRemoval = item }
                            .disabled(model.working || app.isDemo)
                    }
                }
            } header: { Text("Your contacts").foregroundStyle(ShieldTheme.secondaryText) } footer: {
                Text("Removing a number here also removes it from iPhone Contacts.").foregroundStyle(ShieldTheme.secondaryText)
            }
            Section {
                Button("Contacts settings", systemImage: "gearshape") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
            }
        }
        .confirmationDialog("Remove from iPhone Contacts?", isPresented: Binding(get: { pendingRemoval != nil }, set: { if !$0 { pendingRemoval = nil } }), titleVisibility: .visible) {
            Button("Remove contact", role: .destructive) {
                if let item = pendingRemoval { Task { _ = await model.change(false, item: item, app: app); pendingRemoval = nil } }
            }
            Button("Keep contact", role: .cancel) { pendingRemoval = nil }
        } message: { Text("This can also remove the contact from your other devices through iCloud. A restore copy stays on this phone.") }
        .navigationTitle("Your contacts")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, prompt: "Name or number")
        .toolbar { ToolbarItem(placement: .primaryAction) {
            Button("Add contact", systemImage: "plus") { showingAdd = true }.disabled(model.working || app.isDemo || !model.hasShared(app.selectedPersonID))
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

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
    private var filtered: [SavedNumber] {
        search.isEmpty ? model.items.filter(\.isEnabled) : model.items.filter(\.isEnabled).filter { $0.label.localizedStandardContains(search) || $0.phone.localizedStandardContains(search) }
    }

    var body: some View {
        List {
            Section {
                Button { Task { await model.share(app) } } label: {
                    Label(model.working ? "Updating contacts…" : model.hasShared(app.selectedPersonID) ? "Refresh shared contacts" : "Share all iPhone contacts", systemImage: "person.2.badge.plus")
                        .font(.headline).padding(.vertical, 8)
                }
                .disabled(model.working || app.isDemo)
                .accessibilityIdentifier("share-all-contacts")
                if let message = model.message { Text(message).font(.subheadline).foregroundStyle(.secondary) }
            } footer: {
                Text("Share names and phone numbers with Shield. Saved callers ring normally; other calls reach Shield when forwarding is set up.")
            }
            Section {
                ForEach(filtered) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.label).font(.headline)
                        Text(item.phone).font(.subheadline).foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                    .swipeActions {
                        Button("Remove", role: .destructive) { Task { _ = await model.change(false, item: item, app: app) } }
                            .disabled(model.working || app.isDemo)
                    }
                }
            } header: { Text("Let these callers ring") } footer: {
                Text("Removing a number here also removes that number from iPhone Contacts. Shield keeps a restore copy on this phone. Contact changes may sync through iCloud.")
            }
            Section {
                Button("Open iPhone contact settings", systemImage: "gearshape") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
            }
        }
        .navigationTitle("Shared contacts")
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
        .scrollContentBackground(.hidden)
        .background(ShieldTheme.surface)
    }
}

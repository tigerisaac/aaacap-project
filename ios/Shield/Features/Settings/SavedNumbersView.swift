import SwiftUI

struct SavedNumbersView: View {
    enum Kind {
        case destinations, trusted
        var path: String { self == .destinations ? "/api/destinations" : "/api/trusted-numbers" }
        var title: String { self == .destinations ? "Numbers you trust" : "Saved contacts" }
    }

    let kind: Kind
    @Environment(AppState.self) private var model
    @Environment(\.openURL) private var openURL
    @State private var items: [SavedNumber] = []
    @State private var showingAdd = false

    var body: some View {
        List {
            Section {
                ForEach(items) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(item.label).font(.headline)
                            Text(PhoneDisplay.format(item.phone)).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if kind == .destinations {
                            Button("Call", systemImage: "phone.fill") { call(item.phone) }
                                .accessibilityLabel("Call \(item.label)")
                                 .labelStyle(.titleAndIcon)
                                .buttonStyle(.bordered).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                .disabled(model.isDemo)
                        }
                    }
                    .swipeActions {
                        Button("Remove", role: .destructive) { Task { await remove(item) } }
                            .disabled(model.isDemo)
                    }
                }
            } footer: {
                Text(kind == .destinations
                     ? "Save numbers from a card, bill, or official website."
                     : "Unanswered calls from these numbers go to voicemail. A displayed number can be faked.").foregroundStyle(ShieldTheme.secondaryText)
            }
        }
        .overlay {
            if items.isEmpty {
                ContentUnavailableView("No numbers yet", systemImage: "person.crop.square", description: Text("Add a number you already know."))
            }
        }
        .shieldListStyle()
        .navigationTitle(kind.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Add number", systemImage: "plus") { showingAdd = true }
                    .disabled(model.isDemo)
            }
        }
        .sheet(isPresented: $showingAdd, onDismiss: { Task { await load() } }) { AddNumberView(kind: kind) }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        if model.isPreview {
            items = [SavedNumber(id: UUID(), label: "Sample clinic", phone: "+13125550148", provenance: "card", createdAt: .now)]
            return
        }
        guard let personID = model.selectedPersonID else { return }
        do {
            let response: APIResponses.Numbers = try await model.api.send(kind.path, participantID: personID)
            guard model.selectedPersonID == personID else { return }
            items = response.items
        } catch { model.handle(error) }
    }

    private func remove(_ item: SavedNumber) async {
        do {
            let _: APIResponses.Empty = try await model.api.send("\(kind.path)/\(item.id)", method: "DELETE", participantID: model.selectedPersonID)
            items.removeAll { $0.id == item.id }
        } catch { model.handle(error) }
    }

    private func call(_ phone: String) {
        guard !model.isDemo, phone.hasPrefix("+1"), phone.count == 12,
              phone.dropFirst().allSatisfy(\.isNumber), let url = URL(string: "tel:\(phone)") else { return }
        openURL(url)
    }
}

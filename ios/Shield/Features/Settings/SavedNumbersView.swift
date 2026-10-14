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
    @State private var loading = true
    @State private var loadError: String?
    @State private var loadAttempts = 0
    @State private var pendingRemoval: SavedNumber?
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        List {
            if let loadError {
                ShieldGroup {
                    ShieldLoadFailure(title: "Numbers couldn’t load", detail: loadError) { Task { await load() } }
                }
            }
            if loading && items.isEmpty {
                ShieldGroup { ShieldLoadingView(title: "Getting your numbers…") }
            } else if items.isEmpty && loadError == nil {
                ShieldGroup {
                    ContentUnavailableView("No numbers yet", systemImage: "phone",
                        description: Text("Save a number from a card, bill, or official website."))
                    Button("Add a number", systemImage: "plus") { showingAdd = true }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.isDemo)
                }
            }
            ShieldGroup {
                ForEach(items) { item in
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.label).font(.headline).fixedSize(horizontal: false, vertical: true)
                            Text(PhoneDisplay.format(item.phone)).font(.subheadline).monospacedDigit()
                                .foregroundStyle(ShieldTheme.secondaryText)
                                .textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
                        }
                        if typeSize.isAccessibilitySize {
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) { numberActions(item) }
                        } else {
                            HStack(spacing: ShieldTheme.Spacing.content) { numberActions(item) }
                        }
                    }
                    .padding(.vertical, ShieldTheme.Spacing.compact)
                    .swipeActions {
                        Button("Remove", role: .destructive) { pendingRemoval = item }
                            .disabled(model.isDemo)
                    }
                }
            } footer: {
                Text(kind == .destinations
                     ? "Save numbers from a card, bill, or official website."
                     : "Unanswered calls from these numbers go to voicemail. A displayed number can be faked.").foregroundStyle(ShieldTheme.secondaryText)
            }
        }
        .shieldListStyle()
        .navigationTitle(kind.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Add", systemImage: "plus") { showingAdd = true }
                    .labelStyle(.titleAndIcon).accessibilityLabel("Add number")
                    .disabled(model.isDemo)
            }
        }
        .sheet(isPresented: $showingAdd, onDismiss: { Task { await load() } }) { AddNumberView(kind: kind) }
        .task { await load() }
        .refreshable { await load() }
        .alert("Remove \(pendingRemoval?.label ?? "this saved number")?", isPresented: Binding(get: { pendingRemoval != nil }, set: { if !$0 { pendingRemoval = nil } })) {
            Button("Remove number", role: .destructive) { if let item = pendingRemoval { Task { await remove(item) } } }
            Button("Keep number", role: .cancel) { pendingRemoval = nil }
        } message: { Text("You can add it again later.") }
    }

    @ViewBuilder private func numberActions(_ item: SavedNumber) -> some View {
        if kind == .destinations {
            Button { call(item.phone) } label: {
                Label("Call", systemImage: "phone.fill").frame(minHeight: ShieldTheme.Layout.minimumTarget)
            }
            .accessibilityLabel("Call \(item.label)").accessibilityInputLabels(["Call \(item.label)", "Call"])
            .shieldSecondaryButton().disabled(model.isDemo)
        }
        Button("Remove", systemImage: "minus.circle", role: .destructive) { pendingRemoval = item }
            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.isDemo)
            .accessibilityLabel("Remove \(item.label)")
    }

    private func load() async {
        loading = true
        loadError = nil
        defer { loading = false }
        if let failure = PreviewScenario.loadFailure("numbers", attempt: loadAttempts, preview: model.isPreview) {
            loadAttempts += 1
            loadError = failure
            return
        }
        if model.isPreview {
            items = [SavedNumber(id: UUID(), label: "Sample clinic", phone: "+13125550148", provenance: "card", createdAt: .now)]
            return
        }
        guard let personID = model.selectedPersonID else { return }
        do {
            let response: APIResponses.Numbers = try await model.api.send(kind.path, participantID: personID)
            guard model.selectedPersonID == personID else { return }
            items = response.items
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }

    private func remove(_ item: SavedNumber) async {
        guard !model.isPreview, !model.isDemo else { return }
        do {
            let _: APIResponses.Empty = try await model.api.send("\(kind.path)/\(item.id)", method: "DELETE", participantID: model.selectedPersonID)
            items.removeAll { $0.id == item.id }
            pendingRemoval = nil
        } catch { model.handle(error) }
    }

    private func call(_ phone: String) {
        guard !model.isDemo, phone.hasPrefix("+1"), phone.count == 12,
              phone.dropFirst().allSatisfy(\.isNumber), let url = URL(string: "tel:\(phone)") else { return }
        openURL(url)
    }
}

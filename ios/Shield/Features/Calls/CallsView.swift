import SwiftUI

struct CallsView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        @Bindable var model = model
        NavigationShell {
            List {
                Section {
                    Picker("Call type", selection: $model.filter) {
                        ForEach(CallFilter.allCases) { filter in Text(filter.label).tag(filter) }
                    }
                    .pickerStyle(.menu)
                    .accessibilityIdentifier("callFilter")
                }
                if model.calls.isEmpty {
                    ContentUnavailableView(model.filter == .all ? "No calls yet" : "No \(model.filter.label.lowercased()) calls",
                        systemImage: model.filter == .voicemail ? "waveform" : "phone",
                        description: Text("Calls that reach Shield will appear here."))
                } else {
                    ForEach(model.calls) { call in
                        NavigationLink(value: call) { CallRow(call: call) }
                    }
                    if model.nextCursor != nil {
                        Button("Load more calls") { Task { await model.loadCalls(more: true) } }
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                }
            }
            .navigationTitle("Calls")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { PersonPicker() } }
            .task(id: model.filter) { await model.loadCalls() }
            .refreshable { await model.refresh() }
            .scrollContentBackground(.hidden)
            .background(ShieldTheme.surface)
        }
    }
}

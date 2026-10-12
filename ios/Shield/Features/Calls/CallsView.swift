import SwiftUI

struct CallsView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        @Bindable var model = model
        NavigationShell {
            List {
                Section { CallFilterPicker() }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                if let error = model.callsError {
                    Section {
                        ShieldNotice(title: "Your calls couldn’t load", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try Again", systemImage: "arrow.clockwise") { Task { await model.loadCalls() } }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                }
                if model.calls.isEmpty && model.callsError == nil {
                    Section {
                        if model.isLoadingCalls || model.isLoading {
                            ShieldLoadingView(title: "Getting your calls…")
                        } else {
                            ContentUnavailableView(model.filter == .all ? "No calls yet" : "No \(model.filter.label.lowercased()) calls", systemImage: model.filter == .voicemail ? "recordingtape" : "phone", description: Text("Calls that reach Shield will appear here."))
                            if model.filter != .all { Button("Show All Calls") { model.filter = .all }.frame(minHeight: ShieldTheme.Layout.minimumTarget) }
                        }
                    }
                } else if !model.calls.isEmpty {
                    Section {
                        ForEach(model.calls) { call in NavigationLink(value: call) { CallRow(call: call) } }
                        if model.nextCursor != nil {
                            Button(model.isLoadingCalls ? "Getting more…" : "Older calls") { Task { await model.loadCalls(more: true) } }
                                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.isLoadingCalls)
                        }
                    }
                }
            }
            .navigationTitle("Calls")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { PersonPicker() } }
            .task(id: model.filter) { await model.loadCalls() }
            .sensoryFeedback(.selection, trigger: model.filter)
            .refreshable { await model.refresh() }
            .shieldListStyle()
        }
    }
}

/// The call-type filter. Segmented normally; a menu at accessibility sizes where four segments can't fit.
private struct CallFilterPicker: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        @Bindable var model = model
        if typeSize >= .xxxLarge {
            picker($model.filter).pickerStyle(.menu).accessibilityIdentifier("callFilter")
        } else {
            picker($model.filter).pickerStyle(.segmented).accessibilityIdentifier("callFilter")
        }
    }

    private func picker(_ selection: Binding<CallFilter>) -> some View {
        Picker("Call type", selection: selection) {
            ForEach(CallFilter.allCases) { filter in Text(filter.label).tag(filter) }
        }
    }
}

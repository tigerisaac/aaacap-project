import SwiftUI

struct CallsView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        @Bindable var model = model
        NavigationShell {
            List {
                PersonContextSection()
                ShieldGroup(background: .clear) { CallFilterPicker() }
                    .listRowInsets(EdgeInsets())
                if let error = model.callsError {
                    ShieldGroup {
                        ShieldLoadFailure(title: "Your calls couldn’t load", detail: error) { Task { await model.loadCalls() } }
                    }
                }
                if model.calls.isEmpty && model.callsError == nil {
                    ShieldGroup {
                        if model.isLoadingCalls || model.isLoading {
                            ShieldLoadingView(title: "Getting your calls…")
                        } else {
                            ContentUnavailableView(model.filter == .all ? "No calls yet" : "No \(model.filter.label.lowercased()) calls", systemImage: model.filter == .voicemail ? "recordingtape" : "phone", description: Text("Calls that reach Shield will appear here."))
                            if model.filter != .all { Button("Show all calls") { model.filter = .all }.frame(minHeight: ShieldTheme.Layout.minimumTarget) }
                        }
                    }
                } else if !model.calls.isEmpty {
                    // Day headings carry the date, so each row only needs its time.
                    ForEach(CallDay.group(model.calls)) { day in
                        ShieldGroup {
                            ForEach(day.calls) { call in CallNavigationRow(call: call, showsDay: false) }
                        } header: {
                            Text(day.title).shieldHeading(.section).foregroundStyle(ShieldTheme.ink)
                                .textCase(nil).accessibilityAddTraits(.isHeader)
                        }
                    }
                    if model.nextCursor != nil {
                        ShieldGroup {
                            Button(model.isLoadingCalls ? "Getting more…" : "Older calls") { Task { await model.loadCalls(more: true) } }
                                .font(.body.weight(.medium))
                                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.isLoadingCalls)
                        }
                    }
                }
            }
            .shieldLargeTitle("Calls")
            .toolbar { if !typeSize.isAccessibilitySize { ToolbarItem(placement: .topBarTrailing) { PersonPicker() } } }
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
            Menu {
                picker($model.filter)
            } label: {
                HStack(alignment: .firstTextBaseline) {
                    Text(model.filter == .all ? "All calls" : model.filter == .voicemail ? "Messages" : "\(model.filter.label) calls")
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: ShieldTheme.Spacing.compact)
                    Image(systemName: "chevron.down").accessibilityHidden(true)
                }
                .padding(ShieldTheme.Spacing.content)
                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
            }
            .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
            .accessibilityLabel("Call type, \(model.filter.label)")
            .accessibilityHint("Choose which calls to show")
            .accessibilityIdentifier("callFilter")
        } else {
            picker($model.filter).pickerStyle(.segmented).controlSize(.large).accessibilityIdentifier("callFilter")
        }
    }

    private func picker(_ selection: Binding<CallFilter>) -> some View {
        Picker("Call type", selection: selection) {
            ForEach(CallFilter.allCases) { filter in Text(filter.label).tag(filter) }
        }
    }
}

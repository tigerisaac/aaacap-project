import SwiftUI

struct PeopleView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
            List {
                if let error = model.contextError {
                    ShieldGroup {
                        ShieldLoadFailure(title: "Couldn’t get these calls", detail: error) { Task { await model.refresh() } }
                    }
                }
                ShieldSection("Whose calls would you like to see?") {
                    ForEach(model.people) { person in
                        Button {
                            Task { await model.select(person) }
                        } label: {
                            HStack(spacing: ShieldTheme.Layout.rowSymbolSpacing) {
                                if !typeSize.isAccessibilitySize {
                                    ShieldRowSymbol(systemName: person.isOwner ? "person" : "person.2")
                                }
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(person.name).font(.body.weight(.semibold)).foregroundStyle(ShieldTheme.ink)
                                    Text(person.isOwner ? "Your phone" : person.canListen ? "Calls and messages" : "Calls only")
                                        .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                                }
                                Spacer()
                                if person.id == model.selectedPersonID {
                                    Image(systemName: "checkmark")
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(ShieldTheme.action)
                                        .accessibilityHidden(true)
                                }
                            }
                            .padding(.vertical, 8)
                        }
                        .accessibilityIdentifier("person-\(person.name)")
                        .accessibilityElement(children: .combine)
                        .accessibilityAddTraits(person.id == model.selectedPersonID ? .isSelected : [])
                    }
                } footer: {
                    if !model.isOwner { Text("Only they can change their phone settings.") }
                }
            }
            .navigationTitle("Switch person")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await model.refresh() }
            .shieldListStyle()
    }
}

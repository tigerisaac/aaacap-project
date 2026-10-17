import SwiftUI

struct PersonPicker: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        if !typeSize.isAccessibilitySize, model.people.count > 1 {
        Menu {
            ForEach(model.people) { person in
                Button {
                    Task { await model.select(person) }
                } label: {
                    Label(person.isOwner ? "\(person.name) · You" : person.name,
                          systemImage: person.id == model.selectedPersonID ? "checkmark.circle.fill" : "person.crop.circle")
                }
            }
        } label: {
            HStack(spacing: ShieldTheme.Spacing.compact) {
                Image(systemName: model.isOwner ? "person.crop.circle.fill" : "person.2.circle.fill")
                Text(model.person?.name ?? "People").fontWeight(.semibold)
                Image(systemName: "chevron.down").font(.caption.weight(.bold))
            }
            .frame(minHeight: ShieldTheme.Layout.systemTarget)
        }
        .accessibilityLabel("Viewing \(model.person?.name ?? "people"). Change person.")
        .accessibilityInputLabels([model.person?.name ?? "People", "Change person"])
        } else if !typeSize.isAccessibilitySize, !model.isOwner {
            Text(model.person?.name ?? "Shared calls").font(.headline)
        }
    }
}

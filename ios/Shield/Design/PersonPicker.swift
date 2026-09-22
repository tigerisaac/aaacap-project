import SwiftUI

struct PersonPicker: View {
    @Environment(AppState.self) private var model

    var body: some View {
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
            HStack(spacing: 7) {
                Image(systemName: model.isOwner ? "person.crop.circle.fill" : "person.2.circle.fill")
                Text(model.person?.name ?? "People").fontWeight(.semibold)
                Image(systemName: "chevron.down").font(.caption.weight(.bold))
            }
            .frame(minHeight: 44)
        }
        .accessibilityLabel("Viewing \(model.person?.name ?? "people"). Change person.")
    }
}

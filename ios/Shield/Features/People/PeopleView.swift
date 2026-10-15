import SwiftUI

struct PeopleView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .body) private var symbolSize = 36.0

    var body: some View {
            List {
                if let error = model.contextError {
                    ShieldGroup {
                        ShieldNotice(title: "Couldn’t get these calls", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try again", systemImage: "arrow.clockwise") { Task { await model.refresh() } }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                }
                ShieldSection("Whose calls would you like to see?") {
                    ForEach(model.people) { person in
                        Button {
                            Task { await model.select(person) }
                        } label: {
                            HStack(spacing: 14) {
                                if !typeSize.isAccessibilitySize {
                                Image(systemName: person.isOwner ? "person" : "person.2")
                                    .font(.body.weight(.medium)).foregroundStyle(ShieldTheme.action)
                                    .frame(width: symbolSize, height: symbolSize)
                                    .background(ShieldTheme.quietSurface, in: .rect(cornerRadius: 10))
                                    .accessibilityHidden(true)
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
                }
                if !model.isOwner {
                    ShieldGroup {
                        Text("Only they can change their phone settings.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
                if model.isOwner {
                    ShieldGroup {
                        NavigationLink(value: AppRoute.sharing) {
                            ActionRow(title: "Your helpers", symbol: "person.2.badge.gearshape")
                        }
                    } footer: {
                        Text("See who can view your calls, or stop sharing.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
            }
            .shieldLargeTitle("Family & friends")
            .refreshable { await model.refresh() }
            .shieldListStyle()
    }
}

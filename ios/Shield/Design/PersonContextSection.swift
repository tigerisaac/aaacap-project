import SwiftUI

/// At large text sizes the person belongs in the scrollable page, where a full name can wrap.
struct PersonContextSection: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        if typeSize.isAccessibilitySize, model.people.count > 1 || !model.isOwner {
            Section {
                if model.people.count > 1 {
                    NavigationLink(value: AppRoute.people) {
                        Text("\(model.person?.name ?? "Your person")’s calls").font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.vertical, ShieldTheme.Spacing.compact)
                    }
                    .accessibilityIdentifier("change-person")
                    .accessibilityLabel("Calls for \(model.person?.name ?? "your person")")
                    .accessibilityHint("Change person")
                } else {
                    Text("Calls for \(model.person?.name ?? "your person")")
                        .font(.headline).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

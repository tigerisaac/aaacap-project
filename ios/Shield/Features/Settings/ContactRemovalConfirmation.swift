import SwiftUI

struct ContactRemovalConfirmation: View {
    @Environment(\.dismiss) private var dismiss
    let item: SavedNumber
    let keepingRemoved: Bool
    let confirm: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.page) {
                    Text(keepingRemoved ? "Keep this number removed?" : "Remove this number?")
                        .shieldPageHeading().accessibilityAddTraits(.isHeader)
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                        Text(item.label).font(.headline)
                        Text(PhoneDisplay.format(item.phone)).monospacedDigit()
                            .foregroundStyle(ShieldTheme.secondaryText)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    Text(keepingRemoved
                         ? "Shield will remove the number and its extensions from every matching contact to match your shared list."
                         : "This removes the number and its extensions from every matching contact.")
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("contact-removal-scope")
                    Text("Other contact details stay. iCloud may sync the removal to your other devices.")
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("contact-removal-icloud")
                    Text("A restore copy stays on this phone until you add the number back.")
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("contact-removal-backup")
                    Button(role: .destructive, action: confirm) {
                        Text(keepingRemoved ? "Keep number removed" : "Remove number")
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                    .shieldSecondaryButton().tint(ShieldTheme.held)
                    .accessibilityIdentifier("confirm-contact-removal")
                }
                .padding(ShieldTheme.Spacing.page)
                .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .accessibilityIdentifier("contact-removal-explanation")
            .background(ShieldTheme.surface)
            .navigationTitle("Contacts").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(keepingRemoved ? "Cancel" : "Keep number", role: .cancel) { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
}

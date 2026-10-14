import SwiftUI

/// Match the neighboring navigation rows while keeping the entire action tappable.
struct HistoryBrowseLabel: View {
    let title: String

    var body: some View {
        HStack(spacing: ShieldTheme.Spacing.content) {
            Text(title).font(.body.weight(.medium))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.body.weight(.semibold)).accessibilityHidden(true)
        }
        .padding(.vertical, ShieldTheme.Spacing.content)
        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
        .contentShape(.rect)
    }
}

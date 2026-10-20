import SwiftUI

/// Match the neighboring navigation rows while keeping the entire action tappable.
struct HistoryBrowseLabel: View {
    let title: String

    var body: some View {
        HStack(spacing: ShieldTheme.Spacing.content) {
            Text(title).font(.body)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            // Drawn like the native row disclosure so stacked rows share one chevron.
            Image(systemName: "chevron.forward")
                .font(.footnote.weight(.semibold)).imageScale(.large)
                .foregroundStyle(Color(uiColor: .tertiaryLabel)).accessibilityHidden(true)
        }
        // The list row supplies the 52-point height, as for the navigation rows above it.
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(.rect)
    }
}

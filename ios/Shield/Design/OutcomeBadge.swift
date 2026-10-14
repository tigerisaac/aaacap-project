import SwiftUI

/// An unboxed symbol and word. Spaced like inline text, not like a List row's icon column.
struct OutcomeBadge: View {
    let outcome: CallOutcome

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: outcome.symbol).accessibilityHidden(true)
            Text(outcome.label)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(ShieldTheme.color(for: outcome))
        .accessibilityElement(children: .combine)
    }
}

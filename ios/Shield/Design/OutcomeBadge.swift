import SwiftUI

struct OutcomeBadge: View {
    let outcome: CallOutcome

    var body: some View {
        Label(outcome.label, systemImage: outcome.symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(ShieldTheme.color(for: outcome))

    }
}

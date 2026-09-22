import SwiftUI

struct OutcomeBadge: View {
    let outcome: CallOutcome

    var body: some View {
        Label(outcome.label, systemImage: outcome.symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(ShieldTheme.color(for: outcome))
            .padding(.horizontal, 9)
            .padding(.vertical, 6)
            .background(ShieldTheme.color(for: outcome).opacity(0.12), in: .capsule)
    }
}

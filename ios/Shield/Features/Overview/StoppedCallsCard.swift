import SwiftUI

/// The overview API preserves stopped calls beyond history retention.
/// This is historical activity, not a claim that every caller was a scammer or checks are on.
struct StoppedCallsCard: View {
    let count: Int?
    let openCalls: () -> Void

    /// Home's one brand surface: a Health-style summary set on Shield navy. A symbol and label
    /// head it, the figure is New York at Large Title size, and a chevron marks it as a link.
    /// White type on navy measures 14:1; the quieter lines use 80% white (about 9:1).
    var body: some View {
        Button(action: openCalls) {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                HStack(alignment: .firstTextBaseline, spacing: ShieldTheme.Spacing.tight) {
                    Image(systemName: "hand.raised.fill").accessibilityHidden(true)
                    Text("Calls stopped").fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.forward").accessibilityHidden(true)
                        .foregroundStyle(.white.opacity(0.8))
                }
                .font(.subheadline.weight(.semibold))
                if let count, count > 0 {
                    ViewThatFits(in: .horizontal) {
                        HStack(alignment: .firstTextBaseline, spacing: ShieldTheme.Spacing.compact) {
                            total(count)
                            units.fixedSize()
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            total(count)
                            units
                        }
                    }
                } else {
                    Text(count == nil ? "Total unavailable" : "None so far").font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .foregroundStyle(.white)
            .padding(.vertical, ShieldTheme.Spacing.tight)
            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Calls stopped")
        .accessibilityValue(count.map { "\($0) in total" } ?? "Total unavailable")
        .accessibilityHint("Shows recent stopped calls, including calls that need review.")
        .accessibilityIdentifier("home-stopped-calls")
        .listRowBackground(ShieldTheme.brandPanel)
    }

    private var units: some View {
        Text("in total").font(.subheadline.weight(.semibold)).foregroundStyle(.white.opacity(0.8))
    }

    private func total(_ count: Int) -> some View {
        Text(count, format: .number)
            .font(ShieldTheme.Typography.display).monospacedDigit()
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("stopped-call-count")
    }
}

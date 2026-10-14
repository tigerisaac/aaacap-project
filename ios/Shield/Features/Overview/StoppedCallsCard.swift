import SwiftUI

/// The overview API preserves stopped calls beyond history retention.
/// This is historical activity, not a claim that every caller was a scammer or checks are on.
struct StoppedCallsCard: View {
    let count: Int?
    let openCalls: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Button(action: openCalls) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text("Calls stopped").font(.title3.bold())
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Image(systemName: "hand.raised").font(.title3)
                        .accessibilityHidden(true)
                }
                if let count, count > 0 {
                    if typeSize.isAccessibilitySize {
                        total(count)
                        Text("Total").font(.body)
                    } else {
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            total(count)
                            Text("Total").font(.body)
                        }
                    }
                } else {
                    Text(count == nil ? "Total unavailable" : "None so far").font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: 8) {
                    Text("See calls").font(.headline)
                    Image(systemName: "arrow.right").font(.body.weight(.semibold))
                        .accessibilityHidden(true)
                }
                .padding(.top, typeSize.isAccessibilitySize ? 0 : 4)
            }
            .foregroundStyle((count ?? 0) > 0 ? ShieldTheme.actionInk : Color.primary)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Calls stopped")
        .accessibilityValue(count.map { "\($0) in total" } ?? "Total unavailable")
        .accessibilityHint("Shows recent stopped calls, including calls that need review.")
        .accessibilityIdentifier("home-stopped-calls")
        .listRowBackground((count ?? 0) > 0 ? ShieldTheme.action : ShieldTheme.card)
    }

    private func total(_ count: Int) -> some View {
        Text(count, format: .number)
            .font(ShieldTheme.Typography.display.scaled(by: 1.6)).monospacedDigit()
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("stopped-call-count")
    }
}

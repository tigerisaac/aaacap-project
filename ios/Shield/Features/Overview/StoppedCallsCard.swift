import SwiftUI

/// The overview API counts held and review-needed calls over a rolling seven days.
/// This is historical activity, not a claim that every caller was a scammer or checks are on.
struct StoppedCallsCard: View {
    let count: Int
    let openCalls: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Button(action: openCalls) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text("Calls stopped").font(.title3.bold())
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Image(systemName: "hand.raised.fill").font(.title3)
                        .accessibilityHidden(true)
                }
                if count > 0 {
                    Text(count, format: .number)
                        .font(.largeTitle.scaled(by: 1.5).bold()).monospacedDigit()
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("stopped-call-count")
                } else {
                    Text("None in the last 7 days").font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if count > 0 { Text("Last 7 days").font(.body) }
                HStack(spacing: 8) {
                    Text("See calls").font(.headline)
                    Image(systemName: "arrow.right").font(.body.weight(.semibold))
                        .accessibilityHidden(true)
                }
                .padding(.top, typeSize.isAccessibilitySize ? 0 : 4)
            }
            .foregroundStyle(count > 0 ? ShieldTheme.actionInk : Color.primary)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel("\(count) calls stopped in the last 7 days. See calls.")
        .accessibilityHint("Shows stopped calls, including calls that need review.")
        .accessibilityIdentifier("home-stopped-calls")
        .listRowBackground(count > 0 ? ShieldTheme.action : ShieldTheme.card)
    }
}

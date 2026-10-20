import SwiftUI

struct SetupInstruction: View {
    let number: Int
    let title: String
    let detail: String
    @ScaledMetric(relativeTo: .headline) private var numberSize = 32.0
    var body: some View {
        HStack(alignment: .top, spacing: ShieldTheme.Spacing.regular) {
            Text(number, format: .number).font(.headline).foregroundStyle(ShieldTheme.ink)
                .frame(width: numberSize, height: numberSize).background(ShieldTheme.action.opacity(ShieldTheme.tintFillOpacity), in: .circle).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.tight) {
                Text(title).font(.headline)
                Text(detail).foregroundStyle(ForwardingStyle.secondaryText)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

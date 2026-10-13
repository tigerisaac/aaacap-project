import SwiftUI

struct SetupInstruction: View {
    let number: Int
    let title: String
    let detail: String
    @ScaledMetric(relativeTo: .headline) private var numberSize = 32.0
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number, format: .number).font(.headline).foregroundStyle(ShieldTheme.action)
                .frame(width: numberSize, height: numberSize).background(ShieldTheme.action.opacity(0.10), in: .circle).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.headline)
                Text(detail).foregroundStyle(ForwardingStyle.secondaryText)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

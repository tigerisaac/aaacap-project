import SwiftUI

struct SetupInstruction: View {
    let number: Int
    let title: String
    let detail: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number, format: .number).font(.headline).foregroundStyle(ShieldTheme.action)
                .frame(width: 32, height: 32).background(ShieldTheme.action.opacity(0.10), in: .circle).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.headline)
                Text(detail).foregroundStyle(ForwardingStyle.secondaryText)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

import SwiftUI

struct SetupInstruction: View {
    let number: Int
    let title: String
    let detail: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number, format: .number).font(.headline).foregroundStyle(ShieldTheme.action)
                .frame(minWidth: 24, alignment: .leading).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(detail).foregroundStyle(ForwardingStyle.secondaryText)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

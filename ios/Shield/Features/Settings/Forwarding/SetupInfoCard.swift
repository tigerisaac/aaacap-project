import SwiftUI

struct SetupInfoCard: View {
    let title: String
    let detail: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            Text(detail).foregroundStyle(ForwardingStyle.secondaryText)
        }
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        .shieldCard()
        .accessibilityElement(children: .combine)
    }
}

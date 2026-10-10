import SwiftUI

struct OutcomeControl: View {
    let title: String
    let count: Int
    let symbol: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                Text(count, format: .number)
                    .font(.system(.largeTitle, design: .rounded).weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                HStack(spacing: 5) {
                    Image(systemName: symbol).font(.caption).foregroundStyle(color)
                        .accessibilityHidden(true)
                    Text(title).font(.subheadline).foregroundStyle(.secondary)
                        .fixedSize(horizontal: true, vertical: false)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 18)
            .padding(.horizontal, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(count) \(title.lowercased()) this week")
        .accessibilityHint("Show these calls")
    }
}

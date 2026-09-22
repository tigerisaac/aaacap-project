import SwiftUI

struct OutcomeControl: View {
    let title: String
    let count: Int
    let symbol: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: symbol).font(.title3).accessibilityHidden(true)
                Text(count, format: .number).font(.title2.bold()).monospacedDigit()
                Text(title).font(.subheadline.weight(.semibold)).fixedSize(horizontal: true, vertical: false)
            }
            .foregroundStyle(color)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(color.opacity(0.10), in: .rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(count) \(title.lowercased()) this week")
        .accessibilityHint("Show these calls")
    }
}

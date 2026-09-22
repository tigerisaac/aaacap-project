import SwiftUI

struct CallRow: View {
    let call: CallRecord
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: call.outcome.symbol)
                .font(.title3.weight(.semibold))
                .foregroundStyle(ShieldTheme.color(for: call.outcome))
                .frame(width: 46, height: 46)
                .background(ShieldTheme.color(for: call.outcome).opacity(0.12), in: .rect(cornerRadius: 14))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                Text(call.title).font(.headline).foregroundStyle(.primary)
                Text(call.callerNumber).font(.subheadline).foregroundStyle(.secondary)
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 8) {
                        OutcomeBadge(outcome: call.outcome)
                        Text(call.occurredAt, style: .relative).font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        OutcomeBadge(outcome: call.outcome)
                        Text(call.occurredAt, style: .date).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }
}

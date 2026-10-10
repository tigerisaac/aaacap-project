import SwiftUI

struct CallRow: View {
    let call: CallRecord
    var showsNumber = true
    @Environment(\.dynamicTypeSize) private var typeSize

    private var title: String {
        let value = call.title.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty || value.caseInsensitiveCompare("Not enough information") == .orderedSame
            ? call.callerNumber : value
    }

    private var outcomeLabel: String {
        switch call.outcome {
        case .missed: "Missed call"
        case .held: "Held for review"
        case .verification: "Needs review"
        case .voicemail: "Voicemail"
        default: call.outcome.label
        }
    }

    private var callTime: String {
        let time = call.occurredAt.formatted(date: .omitted, time: .shortened)
        if Calendar.current.isDateInToday(call.occurredAt) { return time }
        if Calendar.current.isDateInYesterday(call.occurredAt) { return "Yesterday, \(time)" }
        return call.occurredAt.formatted(date: .abbreviated, time: .shortened)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: call.outcome.symbol)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(ShieldTheme.color(for: call.outcome))
                .frame(width: 46, height: 46)
                .background(ShieldTheme.color(for: call.outcome).opacity(0.12), in: .circle)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.body.weight(.semibold)).foregroundStyle(.primary)
                if showsNumber && title != call.callerNumber {
                    Text(call.callerNumber).font(.subheadline).foregroundStyle(.secondary)
                }
                if typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 4) { outcomeAndTime }
                } else {
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 12) { outcomeAndTime }
                        VStack(alignment: .leading, spacing: 4) { outcomeAndTime }
                    }
                }
            }
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var outcomeAndTime: some View {
        Text(outcomeLabel)
            .foregroundStyle(ShieldTheme.color(for: call.outcome))
            .font(.subheadline.weight(.medium))
            .fixedSize(horizontal: false, vertical: true)
        Text(callTime)
            .font(.subheadline).foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityLabel(call.occurredAt.formatted(date: .complete, time: .shortened))
            .accessibilityIdentifier("call-time-\(call.id)")
    }
}

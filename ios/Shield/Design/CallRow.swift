import SwiftUI

/// Two-line history row modeled on Phone's Recents: summary and time, then outcome and number.
struct CallRow: View {
    let call: CallRecord
    var showsNumber = true
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .body) private var dotSize = 9.0

    private var number: String { PhoneDisplay.format(call.callerNumber) }

    private var title: String {
        let value = call.title.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty || value.caseInsensitiveCompare("Not enough information") == .orderedSame
            ? number : value
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

    /// Don't repeat the outcome when the summary already says it ("Call held for review").
    private var showsOutcomeWord: Bool {
        !title.localizedCaseInsensitiveContains(outcomeLabel)
    }

    private var unheard: Bool { call.voicemail != nil && call.voicemail?.heardAt == nil }

    private var callTime: String {
        let time = call.occurredAt.formatted(date: .omitted, time: .shortened)
        if Calendar.current.isDateInToday(call.occurredAt) { return time }
        if Calendar.current.isDateInYesterday(call.occurredAt) { return "Yesterday" }
        return call.occurredAt.formatted(.dateTime.month(.abbreviated).day())
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Circle().fill(ShieldTheme.message)
                .frame(width: dotSize, height: dotSize)
                .opacity(unheard ? 1 : 0)
                .accessibilityLabel(unheard ? "Unheard message" : "")
                .accessibilityHidden(!unheard)
            VStack(alignment: .leading, spacing: 4) {
                if typeSize.isAccessibilitySize {
                    titleText
                    timeText
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        titleText
                        Spacer(minLength: 8)
                        timeText
                    }
                }
                detailLine
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    private var titleText: some View {
        Text(title).font(.body.weight(.semibold)).foregroundStyle(.primary)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var timeText: some View {
        Text(callTime)
            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            .accessibilityLabel(call.occurredAt.formatted(date: .complete, time: .shortened))
            .accessibilityIdentifier("call-time-\(call.id)")
    }

    private var detailLine: some View {
        // Wraps rather than truncating at larger text sizes.
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: call.outcome.symbol)
                .foregroundStyle(ShieldTheme.color(for: call.outcome))
                .accessibilityHidden(showsOutcomeWord)
                .accessibilityLabel(outcomeLabel)
            if showsOutcomeWord {
                Text(outcomeLabel).foregroundStyle(ShieldTheme.color(for: call.outcome)).fontWeight(.medium)
            }
            if showsNumber && title != number {
                Text(number).foregroundStyle(ShieldTheme.secondaryText)
            }
        }
        .font(.subheadline)
    }
}

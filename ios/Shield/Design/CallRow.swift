import SwiftUI

/// Two-line history row modeled on Phone's Recents: summary and time, then outcome and number.
struct CallRow: View {
    let call: CallRecord
    var showsNumber = true
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityDifferentiateWithoutColor) private var differentiateWithoutColor
    @ScaledMetric(relativeTo: .body) private var dotSize = 9.0

    private var number: String { PhoneDisplay.format(call.callerNumber) }

    private var title: String {
        CallPresentation.title(call)
    }

    private var outcomeLabel: String {
        switch call.outcome {
        case .missed: "Missed call"
        case .held: "Stopped"
        case .verification: "Check first"
        case .voicemail: call.voicemail?.kindLabel ?? "Voicemail"
        default: call.outcome.label
        }
    }

    /// Don't repeat the outcome when the summary already says it ("Call held for review").
    private var showsOutcomeWord: Bool {
        !title.localizedCaseInsensitiveContains(outcomeLabel)
    }

    private var unheard: Bool { call.voicemail != nil && call.voicemail?.heardAt == nil && call.voicemail?.status != "removed" }

    private var callTime: String {
        let time = call.occurredAt.formatted(date: .omitted, time: .shortened)
        if Calendar.current.isDateInToday(call.occurredAt) { return time }
        if Calendar.current.isDateInYesterday(call.occurredAt) { return "Yesterday" }
        return call.occurredAt.formatted(.dateTime.month(.abbreviated).day())
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            if unheard && !typeSize.isAccessibilitySize && !differentiateWithoutColor {
            Circle().fill(ShieldTheme.message)
                .frame(width: dotSize, height: dotSize)
                .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 4) {
                if typeSize >= .xxxLarge {
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
                if unheard && (typeSize.isAccessibilitySize || differentiateWithoutColor) {
                    Text("New message").font(.subheadline).foregroundStyle(ShieldTheme.message)
                }
            }
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
        .accessibilityValue(unheard ? "New message" : "")
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
        Group {
            if typeSize >= .xxxLarge {
                VStack(alignment: .leading, spacing: 6) {
                    outcomeText
                    numberText
                }
            } else {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    outcomeText
                    numberText
                }
            }
        }
        .font(.subheadline)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var outcomeText: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: call.outcome.symbol)
                .foregroundStyle(ShieldTheme.color(for: call.outcome))
                .accessibilityHidden(showsOutcomeWord)
                .accessibilityLabel(outcomeLabel)
            if showsOutcomeWord {
                Text(outcomeLabel).foregroundStyle(ShieldTheme.color(for: call.outcome)).fontWeight(.medium)
            }
        }
    }

    @ViewBuilder private var numberText: some View {
        if showsNumber && title != number {
            Text(number).foregroundStyle(ShieldTheme.secondaryText)
        }
    }
}

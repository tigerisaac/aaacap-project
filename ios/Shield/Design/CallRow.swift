import SwiftUI

/// Familiar Recents layout with a stable leading column and explicit outcome text.
struct CallRow: View {
    let call: CallRecord
    var showsNumber = true
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .body) private var symbolSize = 36.0

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
        HStack(alignment: .top, spacing: 14) {
            if !typeSize.isAccessibilitySize {
                Image(systemName: call.outcome.symbol)
                    .font(.body.weight(.medium))
                    .foregroundStyle(ShieldTheme.color(for: call.outcome))
                    .frame(width: symbolSize, height: symbolSize)
                    .background(ShieldTheme.quietSurface, in: .rect(cornerRadius: 10))
                    .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 6) {
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
                if showsOutcomeWord || (showsNumber && title != number) {
                    detailLine
                }
                if unheard {
                    Text("New message").font(.subheadline.weight(.medium)).foregroundStyle(ShieldTheme.message)
                }
            }
        }
        .padding(.vertical, 10)
    }

    var accessibilityDetails: String {
        var parts = [String]()
        if showsOutcomeWord { parts.append(outcomeLabel) }
        if showsNumber && title != number { parts.append(number) }
        if unheard { parts.append("New message") }
        parts.append(call.occurredAt.formatted(date: .complete, time: .shortened))
        return parts.joined(separator: ". ")
    }

    private var titleText: some View {
        Text(title).font(.body.weight(.semibold)).foregroundStyle(ShieldTheme.ink)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var timeText: some View {
        Text(callTime)
            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
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
                MetadataLine.joined([
                    showsOutcomeWord ? outcomeWord : nil,
                    showsNumber && title != number ? Text(PhoneDisplay.unbroken(number)) : nil
                ])
                .foregroundStyle(ShieldTheme.secondaryText)
            }
        }
        .font(.subheadline)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var outcomeWord: Text {
        Text(outcomeLabel).foregroundStyle(ShieldTheme.color(for: call.outcome)).fontWeight(.medium)
    }

    private var outcomeText: some View {
        Group {
            if showsOutcomeWord { outcomeWord }
        }
    }

    @ViewBuilder private var numberText: some View {
        if showsNumber && title != number {
            Text(number).foregroundStyle(ShieldTheme.secondaryText)
        }
    }
}

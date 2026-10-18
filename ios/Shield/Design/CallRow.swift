import SwiftUI

/// Familiar Recents layout with a stable leading column and explicit outcome text.
struct CallRow: View {
    let call: CallRecord
    var showsNumber = true
    /// False under a day heading, where the row only needs its time.
    var showsDay = true
    @Environment(\.dynamicTypeSize) private var typeSize

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
        if !showsDay || Calendar.current.isDateInToday(call.occurredAt) { return time }
        if Calendar.current.isDateInYesterday(call.occurredAt) { return "Yesterday" }
        return call.occurredAt.formatted(.dateTime.month(.abbreviated).day())
    }

    var body: some View {
        // The symbol centers on the text block, as in Phone and Mail, rather than riding above it.
        HStack(alignment: .center, spacing: ShieldTheme.Layout.rowSymbolSpacing) {
            if !typeSize.isAccessibilitySize {
                ShieldRowSymbol(systemName: call.outcome.symbol, color: ShieldTheme.color(for: call.outcome))
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
                if outcomeWord != nil || newMessageWord != nil || (showsNumber && title != number) {
                    detailLine
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
            .fixedSize()
            .accessibilityIdentifier("call-time-\(call.id)")
    }

    private var detailLine: some View {
        Group {
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 6) {
                    if let outcomeWord { outcomeWord }
                    if let newMessageWord { newMessageWord }
                    numberText
                }
            } else {
                MetadataLine.joined([
                    outcomeWord,
                    newMessageWord,
                    showsNumber && title != number ? Text(PhoneDisplay.unbroken(number)) : nil
                ])
                .foregroundStyle(ShieldTheme.secondaryText)
            }
        }
        .font(.subheadline)
        .fixedSize(horizontal: false, vertical: true)
    }

    /// The symbol carries the outcome color; text stays calm so an unheard message is the one accent.
    /// "New voicemail" replaces a voicemail outcome's own word rather than repeating it.
    private var outcomeWord: Text? {
        guard showsOutcomeWord, !(unheard && call.outcome == .voicemail) else { return nil }
        return Text(outcomeLabel).fontWeight(.medium).foregroundStyle(ShieldTheme.secondaryText)
    }

    private var newMessageWord: Text? {
        guard unheard else { return nil }
        return Text("New \((call.voicemail?.kindLabel ?? "Message").lowercased())")
            .fontWeight(.semibold).foregroundStyle(ShieldTheme.message)
    }

    @ViewBuilder private var numberText: some View {
        if showsNumber && title != number {
            Text(number).foregroundStyle(ShieldTheme.secondaryText)
        }
    }
}

import SwiftUI

struct VoicemailRow: View {
    let call: CallRecord
    var kept = false
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        HStack(alignment: .center, spacing: ShieldTheme.Layout.rowSymbolSpacing) {
            if !typeSize.isAccessibilitySize {
                ShieldRowSymbol(systemName: kept ? "bookmark.fill" : "recordingtape", color: ShieldTheme.message, style: .avatar)
            }
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.tight) {
                Text(CallPresentation.title(call)).font(.headline).foregroundStyle(ShieldTheme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                messageInfo
            }
        }
        .padding(.vertical, ShieldTheme.Spacing.compact)
    }

    var accessibilityDetails: String {
        var parts = [String]()
        if let message = call.voicemail, message.status != "removed" { parts.append(message.kindLabel) }
        if kept { parts.append("Kept") }
        else if call.voicemail?.status == "removed" { parts.append("Removed") }
        else if call.voicemail?.heardAt == nil { parts.append("New message") }
        parts.append(call.occurredAt.formatted(date: .complete, time: .shortened))
        return parts.joined(separator: ". ")
    }

    private var dateLabel: String {
        Calendar.current.isDateInToday(call.occurredAt) ? "Today" : Calendar.current.isDateInYesterday(call.occurredAt) ? "Yesterday" : call.occurredAt.formatted(.dateTime.month(.abbreviated).day())
    }

    private var stateText: Text? {
        if kept { return Text("\(Image(systemName: "bookmark.fill")) Kept") }
        if call.voicemail?.status == "removed" { return Text("\(Image(systemName: "trash")) Removed") }
        return nil
    }

    private var unheard: Bool { !kept && call.voicemail?.heardAt == nil && call.voicemail?.status != "removed" }

    /// "New voicemail" while unheard, the plain kind afterwards: the one accent is what still needs listening.
    private var kindText: Text? {
        guard let message = call.voicemail, message.status != "removed" else { return nil }
        if unheard { return Text("New \(message.kindLabel.lowercased())").fontWeight(.semibold).foregroundStyle(ShieldTheme.message) }
        return Text(message.kindLabel)
    }

    @ViewBuilder private var messageInfo: some View {
        Group {
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.tight) {
                    if let kindText { kindText }
                    if let stateText { stateText }
                    Text(dateLabel)
                }
            } else {
                MetadataLine.joined([kindText, stateText, Text(dateLabel)])
            }
        }
        .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
}

import SwiftUI

struct VoicemailRow: View {
    let call: CallRecord
    var kept = false
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .body) private var symbolSize = 36.0

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            if !typeSize.isAccessibilitySize {
                Image(systemName: kept ? "bookmark" : "recordingtape")
                    .font(.body.weight(.medium)).foregroundStyle(ShieldTheme.message)
                    .frame(width: symbolSize, height: symbolSize)
                    .background(ShieldTheme.quietSurface, in: .rect(cornerRadius: 10))
                    .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(CallPresentation.title(call)).font(.body.weight(.semibold)).foregroundStyle(ShieldTheme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                messageInfo
            }
        }
        .padding(.vertical, 10)
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
        if call.voicemail?.heardAt == nil { return Text("New").fontWeight(.semibold).foregroundStyle(ShieldTheme.message) }
        return nil
    }

    private var kindText: Text? {
        guard let message = call.voicemail, message.status != "removed" else { return nil }
        return Text(message.kindLabel)
    }

    @ViewBuilder private var messageInfo: some View {
        Group {
            if typeSize >= .xxxLarge {
                VStack(alignment: .leading, spacing: 6) {
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

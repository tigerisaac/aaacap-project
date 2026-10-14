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
            VStack(alignment: .leading, spacing: 8) {
            Text(CallPresentation.title(call)).font(.body.weight(.semibold)).foregroundStyle(ShieldTheme.ink)
                .fixedSize(horizontal: false, vertical: true)
            if typeSize >= .xxxLarge {
                VStack(alignment: .leading, spacing: 6) { messageInfo }
            } else {
                HStack(spacing: 8) { messageInfo }
            }
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

    @ViewBuilder private var messageInfo: some View {
            Group {
                if let message = call.voicemail, message.status != "removed" { Text(message.kindLabel) }
                if kept { Label("Kept", systemImage: "bookmark.fill") }
                else if call.voicemail?.status == "removed" { Label("Removed", systemImage: "trash") }
                else if call.voicemail?.heardAt == nil { Text("New").fontWeight(.medium).foregroundStyle(ShieldTheme.message) }
                Text(Calendar.current.isDateInToday(call.occurredAt) ? "Today" : Calendar.current.isDateInYesterday(call.occurredAt) ? "Yesterday" : call.occurredAt.formatted(.dateTime.month(.abbreviated).day()))
            }
            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
    }
}

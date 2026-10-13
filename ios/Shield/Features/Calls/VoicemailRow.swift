import SwiftUI

struct VoicemailRow: View {
    let call: CallRecord
    var showsPreview = false
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
            if showsPreview, call.voicemail?.status != "removed", let summary = call.voicemail?.summary {
                Text(summary).foregroundStyle(ShieldTheme.secondaryText).lineLimit(typeSize.isAccessibilitySize ? 2 : 3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if typeSize >= .xxxLarge {
                VStack(alignment: .leading, spacing: 6) { messageInfo }
            } else {
                HStack(spacing: 8) { messageInfo }
            }
            }
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("voicemail-row-\(call.id)")
    }

    @ViewBuilder private var messageInfo: some View {
            Group {
                if let message = call.voicemail, message.status != "removed" { Text(message.kindLabel) }
                if kept { Label("Kept", systemImage: "bookmark.fill") }
                else if call.voicemail?.status == "removed" { Label("Removed", systemImage: "trash") }
                else if call.voicemail?.heardAt == nil { Text("New").fontWeight(.medium).foregroundStyle(ShieldTheme.message) }
                Text(Calendar.current.isDateInToday(call.occurredAt) ? "Today" : Calendar.current.isDateInYesterday(call.occurredAt) ? "Yesterday" : call.occurredAt.formatted(.dateTime.month(.abbreviated).day()))
                    .accessibilityLabel(call.occurredAt.formatted(date: .complete, time: .shortened))
            }
            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
    }
}

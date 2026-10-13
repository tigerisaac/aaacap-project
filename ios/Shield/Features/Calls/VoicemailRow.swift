import SwiftUI

struct VoicemailRow: View {
    let call: CallRecord
    var showsPreview = false
    var kept = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(CallPresentation.title(call)).font(.headline).foregroundStyle(.primary)
                .fixedSize(horizontal: false, vertical: true)
            if showsPreview, call.voicemail?.status != "removed", let summary = call.voicemail?.summary {
                Text(summary).foregroundStyle(ShieldTheme.secondaryText).lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 8) {
                if let message = call.voicemail, message.status != "removed" { Text(message.kindLabel) }
                if kept { Label("Kept", systemImage: "bookmark.fill") }
                else if call.voicemail?.status == "removed" { Label("Removed", systemImage: "trash") }
                else if call.voicemail?.heardAt == nil { Text("New") }
                Text(Calendar.current.isDateInToday(call.occurredAt) ? "Today" : Calendar.current.isDateInYesterday(call.occurredAt) ? "Yesterday" : call.occurredAt.formatted(.dateTime.month(.abbreviated).day()))
            }
            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("voicemail-row-\(call.id)")
    }
}

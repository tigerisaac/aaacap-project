import SwiftUI

struct MessageNavigationRow: View {
    let call: CallRecord
    var kept = false

    var body: some View {
        let row = VoicemailRow(call: call, kept: kept)
        let title = CallPresentation.title(call)
        NavigationLink(value: call) { row }
            .accessibilityLabel(title)
            .accessibilityValue(row.accessibilityDetails)
            .accessibilityInputLabels([title, "Open \(title)"])
            .accessibilityHint("Open the message to read or listen")
            .accessibilityIdentifier("voicemail-row-\(call.id)")
    }
}

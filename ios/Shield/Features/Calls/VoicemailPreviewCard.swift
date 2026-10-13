import SwiftUI

struct VoicemailPreviewCard: View {
    let call: CallRecord
    @Environment(AppState.self) private var app
    private var kept: Bool { app.demoKeptMessages.contains(call.id) }

    var body: some View {
        Section {
            Text(VoicemailPreview.summary(for: call)).font(.title3)
                .accessibilityIdentifier("message-summary")
                .fixedSize(horizontal: false, vertical: true)
            if app.isOwner {
            Button {
                if kept { app.demoKeptMessages.remove(call.id) } else { app.demoKeptMessages.insert(call.id) }
            } label: {
                Label(kept ? "Message kept" : "Keep this message", systemImage: kept ? "bookmark.fill" : "bookmark")
                    .font(.headline).frame(minHeight: ShieldTheme.Layout.minimumTarget)
            }
            .accessibilityIdentifier("keep-sample-message")
            }
        } header: { Text("Sample summary").foregroundStyle(ShieldTheme.secondaryText) } footer: {
            Text("Sample features only. Real messages don’t change.").foregroundStyle(ShieldTheme.secondaryText)
        }
    }
}

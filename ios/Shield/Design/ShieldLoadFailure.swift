import SwiftUI

/// A failed load has an explanation and a visible way to recover, never an empty-data claim.
struct ShieldLoadFailure: View {
    let title: String
    let detail: String
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
            ShieldNotice(title: title, detail: detail, symbol: "wifi.exclamationmark")
            Button(action: retry) {
                Label("Try again", systemImage: "arrow.clockwise")
                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
            }
            .shieldSecondaryButton()
        }
        .padding(.vertical, ShieldTheme.Spacing.compact)
    }
}

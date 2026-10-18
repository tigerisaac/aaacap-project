import SwiftUI

/// A failed load has an explanation and a visible way to recover, never an empty-data claim.
struct ShieldLoadFailure: View {
    let title: String
    let detail: String
    var symbol = "wifi.exclamationmark"
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
            ShieldNotice(title: title, detail: detail, symbol: symbol)
            Button(action: retry) {
                Label("Try again", systemImage: "arrow.clockwise").shieldWrappingLabel()
                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
            }
            .shieldSecondaryButton()
        }
        .padding(.vertical, ShieldTheme.Spacing.compact)
    }
}

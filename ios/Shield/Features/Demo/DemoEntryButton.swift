import SwiftUI

struct DemoEntryButton: View {
    @Environment(AppState.self) private var model
    @State private var opening = false

    var body: some View {
        VStack(spacing: ShieldTheme.Spacing.compact) {
            Button {
                guard !opening else { return }
                opening = true
                Task { await model.enterReviewDemo(); opening = false }
            } label: {
                Text(opening ? "Opening demo…" : "Explore demo")
                    .font(.headline).foregroundStyle(ShieldTheme.action)
                    .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
            }
                .shieldSecondaryButton().disabled(opening)
                .accessibilityIdentifier("explore-review-demo")
            Text("Fictional calls. No phone setup or purchase.")
                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        }
    }
}

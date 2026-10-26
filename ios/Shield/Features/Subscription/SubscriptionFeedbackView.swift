import SwiftUI

struct SubscriptionFeedbackView: View {
    @Environment(AppState.self) private var app
    @AccessibilityFocusState private var statusFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if app.subscription.working {
                ProgressView(app.subscription.workingTitle)
            }
            if app.subscription.error == nil, let message = app.subscription.message {
                Text(message).accessibilityFocused($statusFocused)
            }
            if let error = app.subscription.error {
                VStack(alignment: .leading, spacing: 10) {
                    Text(app.subscription.errorTitle).font(.headline)
                    if let message = app.subscription.message { Text(message) }
                    Text(error).foregroundStyle(ShieldTheme.secondaryText)
                    Button(app.subscription.errorActionTitle) {
                        if !app.isPreview { Task { await app.subscription.retry(api: app.api) } }
                    }
                    .disabled(app.subscription.working)
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                }
                .accessibilityFocused($statusFocused)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .onChange(of: app.subscription.message) { _, value in if value != nil { statusFocused = true } }
        .onChange(of: app.subscription.error) { _, value in if value != nil { statusFocused = true } }
        .onAppear { if app.subscription.message != nil || app.subscription.error != nil { statusFocused = true } }
    }
}

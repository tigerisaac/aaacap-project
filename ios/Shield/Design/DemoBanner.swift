import SwiftUI

/// Persistent sample-data marker in its own opaque area, clear of scrolling rows.
struct DemoBanner: View {
    @Environment(AppState.self) private var model

    var body: some View {
        Label(model.isTestAccount ? "Test account · Sample data" : "Sample app", systemImage: "play.circle")
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .accessibilityLabel(model.isTestAccount ? "Test account, sample activity" : "Sample app, no real calls")
            .accessibilityIdentifier("demoBanner")
    }
}

extension View {
    @ViewBuilder
    func demoAccessory(_ isDemo: Bool) -> some View {
        if isDemo {
            VStack(spacing: 0) {
                DemoBanner().padding(.vertical, 8).background(ShieldTheme.surface)
                self
            }
        } else { self }
    }
}

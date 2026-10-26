import SwiftUI

/// Persistent sample-data marker in its own opaque area, clear of scrolling rows.
struct DemoBanner: View {
    @Environment(AppState.self) private var model

    var body: some View {
        // A quiet tag, so it never reads as the screen's title just below it.
        Text(model.isTestAccount ? "Test account · Sample data" : "Sample app")
            .font(.subheadline.weight(.medium))
            .fixedSize(horizontal: false, vertical: true)
            .multilineTextAlignment(.center)
            .foregroundStyle(ShieldTheme.secondaryText)
            .padding(.horizontal, ShieldTheme.Spacing.regular)
            .padding(.vertical, 4)
            .background(ShieldTheme.quietSurface, in: .capsule)
            // A status marker, not reading content: it grows into the first accessibility size, then holds.
            .dynamicTypeSize(...DynamicTypeSize.accessibility1)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .accessibilityLabel(model.isTestAccount ? "Test account, sample activity" : "Sample app, no real calls")
            .accessibilityIdentifier("demoBanner")
    }
}

extension View {
    @ViewBuilder
    func demoAccessory(_ isDemo: Bool) -> some View {
        if isDemo && !isAppStoreCapture {
            VStack(spacing: 0) {
                DemoBanner().padding(.vertical, 8).background(ShieldTheme.surface)
                self
            }
        } else { self }
    }

    /// Store captures use fictional activity with the normal app layout. This
    /// removes only the development marker; all sample-mode safety gates remain.
    private var isAppStoreCapture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        ProcessInfo.processInfo.arguments.contains("--uitesting-app-store-capture")
        #else
        false
        #endif
    }
}

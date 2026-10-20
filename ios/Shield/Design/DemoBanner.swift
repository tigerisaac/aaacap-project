import SwiftUI

/// Persistent sample-data marker in its own opaque area, clear of scrolling rows.
struct DemoBanner: View {
    @Environment(AppState.self) private var model

    var body: some View {
        let label = Label(model.isTestAccount ? "Test account · Sample data" : "Sample app", systemImage: "sparkles")
            .font(.subheadline.weight(.semibold))
            .fixedSize(horizontal: false, vertical: true)
            .multilineTextAlignment(.center)
            .foregroundStyle(ShieldTheme.secondaryText)
            // A status marker, not reading content: it grows into the first accessibility size, then holds.
            .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        label
            .padding(.horizontal, ShieldTheme.Spacing.regular)
            .padding(.vertical, ShieldTheme.Spacing.tight)
            .background(ShieldTheme.card, in: .capsule)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, ShieldTheme.Spacing.content)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(model.isTestAccount ? "Test account, sample activity" : "Sample app, no real calls")
            .accessibilityAddTraits(.isStaticText)
            .accessibilityIdentifier("demoBanner")
    }
}

extension View {
    @ViewBuilder
    func demoAccessory(_ isDemo: Bool) -> some View {
        if isDemo {
            VStack(spacing: 0) {
                DemoBanner().padding(.vertical, ShieldTheme.Spacing.compact).background(ShieldTheme.surface)
                self
            }
        } else { self }
    }
}

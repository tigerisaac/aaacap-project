import SwiftUI

/// Persistent sample-data marker. Shown in the tab bar's bottom accessory so it stays visible
/// on every tab without taking space from each screen. Exit lives on Today and in Settings.
struct DemoBanner: View {
    @Environment(AppState.self) private var model

    var body: some View {
        Label(model.isTestAccount ? "Test account · Sample data" : "Demo · Sample data", systemImage: "play.circle")
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .accessibilityLabel(model.isTestAccount ? "Test account, sample activity" : "Demo, sample activity")
            .accessibilityIdentifier("demoBanner")
    }
}

extension View {
    @ViewBuilder
    func demoAccessory(_ isDemo: Bool) -> some View {
        if isDemo { tabViewBottomAccessory { DemoBanner() } } else { self }
    }
}

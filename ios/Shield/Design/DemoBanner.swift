import SwiftUI

struct DemoBanner: View {
    @Environment(AppState.self) private var model

    var body: some View {
        HStack {
            Label("Demo · sample activity", systemImage: "sparkle")
                .accessibilityIdentifier("demoBanner")
                .font(.caption.weight(.semibold))
            Spacer()
            Button("Exit") { Task { await model.signOut() } }
                .font(.caption.weight(.bold))
                .frame(minWidth: 44, minHeight: 44)
        }
        .foregroundStyle(ShieldTheme.action)
        .padding(.horizontal, 20)
        .background(ShieldTheme.action.opacity(0.10))
    }
}

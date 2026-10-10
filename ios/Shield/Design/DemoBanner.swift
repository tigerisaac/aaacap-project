import SwiftUI

struct DemoBanner: View {
    @Environment(AppState.self) private var model

    var body: some View {
        HStack {
            Label("Demo", systemImage: "play.circle")
                .accessibilityLabel("Demo, sample activity")
                .accessibilityIdentifier("demoBanner")
                .font(.caption.weight(.semibold))
            Spacer()
            Button("Exit") { Task { await model.signOut() } }
                .font(.caption.weight(.bold))
                .frame(minWidth: 44, minHeight: 44)
        }
        .foregroundStyle(ShieldTheme.action)
        .padding(.horizontal, 20)
        .background(ShieldTheme.surface)
    }
}

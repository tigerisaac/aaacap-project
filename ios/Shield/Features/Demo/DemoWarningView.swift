import SwiftUI

struct DemoWarningView: View {
    @State private var player = VoicePlayer()
    @State private var error: String?
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
            Text("Sample spoken warning").font(.headline)
            Text("A prerecorded example. No call is connected or disconnected in this demo.")
                .foregroundStyle(ShieldTheme.secondaryText)
            Button {
                Task {
                    error = nil
                    do {
                        if player.playing { player.pause() }
                        else if player.paused { try await player.resume() }
                        else { try await player.play(data: ReviewDemo.audio(named: "DemoWarning")) }
                    } catch { self.error = "The sample couldn’t play. Try again." }
                }
            } label: {
                Text(player.loading ? "Loading warning…" : player.playing ? "Pause warning" : player.paused ? "Resume warning" : "Hear sample warning")
                    .font(.headline).foregroundStyle(ShieldTheme.action)
                    .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
            }.shieldSecondaryButton().disabled(player.loading)
            if let error { Text(error).foregroundStyle(ShieldTheme.held) }
        }
        .onDisappear { player.stop() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { player.stop() } }
    }
}

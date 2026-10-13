import SwiftUI

struct MessagePlaybackProgress: View {
    let player: VoicePlayer
    let restart: () -> Void

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { _ in
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                ProgressView(value: min(player.elapsed, player.duration), total: max(1, player.duration))
                    .accessibilityLabel("Message playback")
                    .accessibilityValue("\(time(player.elapsed)) of \(time(player.duration))")
                Text("\(time(player.elapsed)) of \(time(player.duration))")
                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    .monospacedDigit().accessibilityHidden(true)
                Button("Start over", systemImage: "backward.end", action: restart)
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
            }
        }
    }

    private func time(_ seconds: TimeInterval) -> String {
        Duration.seconds(Int(seconds)).formatted(.units(allowed: [.minutes, .seconds], width: .wide))
    }
}

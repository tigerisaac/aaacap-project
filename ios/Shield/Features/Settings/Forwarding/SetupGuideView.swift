import SwiftUI

struct SetupGuideView: View {
    let guide: SetupGuide
    @Bindable var player: SetupGuidePlayer
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !player.unavailable {
                Image("setup-\(guide.rawValue)-poster")
                    .resizable()
                    .aspectRatio(1.5, contentMode: .fit)
                    .overlay {
                        SetupGuideVideoSurface(guidePlayer: player)
                            .opacity(player.hasFrame && !player.isFloating ? 1 : 0.01)
                    }
                    .overlay {
                        if player.isFloating {
                            Label("Guide is floating", systemImage: "pip")
                                .font(.headline).padding()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(ShieldTheme.surface)
                        }
                    }
                    .clipShape(.rect(cornerRadius: 12))
                    .accessibilityHidden(true)
                if typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 0) { playbackButton; floatingButton }
                } else {
                    HStack { playbackButton; Spacer(minLength: 8); floatingButton }
                }
            }
            if player.unavailable || player.floatingUnavailable {
                Text(player.unavailable ? "The video couldn’t load. Follow the written steps below." : "Floating video isn’t available. Watch here, then follow the written steps.")
                    .font(.callout)
                    .accessibilityIdentifier("setup-guide-fallback")
                Text(guide.instructions).font(.callout)
            } else {
                Text("The guide stays above the other app. Drag to move it; pinch to make it larger.")
                    .font(.callout).foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .task(id: guide.rawValue + String(reduceMotion)) { await player.prepare(guide, reduceMotion: reduceMotion) }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("setup-visual-guide")
    }

    private var playbackButton: some View {
        Button(player.isPlaying ? "Pause guide" : "Play guide", systemImage: player.isPlaying ? "pause.circle" : "play.circle") {
            player.togglePlayback()
        }
        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
        .accessibilityIdentifier("setup-guide-playback")
    }

    private var floatingButton: some View {
        Button("Float guide", systemImage: "pip.enter") {
            Task { await player.startFloating() }
        }
        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
        .disabled(player.isFloating)
        .accessibilityHint("Keeps the video visible while you use Settings or Phone.")
        .accessibilityIdentifier("setup-guide-float")
    }
}

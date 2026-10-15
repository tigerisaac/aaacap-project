import SwiftUI

struct SetupGuideView: View {
    let guide: SetupGuide
    @Bindable var player: SetupGuidePlayer
    var animateNavigation = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            // The system needs a mounted AVPlayerLayer to carry the reminder
            // into Settings. The independently authored GIF covers it in Shield.
            SetupGuideVideoSurface(guidePlayer: player)
            if reduceMotion || !animateNavigation {
                Image("setup-\(guide.rawValue)-poster").resizable()
            } else {
                SetupTouchAnimation(guide: guide, running: scenePhase == .active)
            }
        }
        .aspectRatio(1.5, contentMode: .fit)
        .clipShape(.rect(cornerRadius: 12))
        .accessibilityHidden(true)
        .task(id: guide.rawValue + String(reduceMotion)) { await player.prepare(guide, reduceMotion: reduceMotion) }
    }
}

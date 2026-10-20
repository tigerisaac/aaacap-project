import SwiftUI

struct SetupGuideView: View {
    let guide: SetupGuide
    @Bindable var player: SetupGuidePlayer
    var showingResult = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            // The system needs a mounted AVPlayerLayer to carry the reminder
            // into Settings. The independently authored GIF covers it in Shield.
            SetupGuideVideoSurface(guidePlayer: player)
            if reduceMotion || showingResult {
                SetupGuidePoster(guide: guide)
            } else {
                SetupTouchAnimation(guide: guide, running: scenePhase == .active)
            }
        }
        .aspectRatio(1.5, contentMode: .fit)
        .clipShape(.rect(cornerRadius: ShieldTheme.Layout.innerRadius))
        .accessibilityHidden(true)
        .task(id: guide.rawValue + String(reduceMotion || showingResult)) {
            await player.prepare(guide, reduceMotion: reduceMotion || showingResult)
        }
    }
}

/// Keep the poster in the same native view stack as the animated image, above
/// AVPlayerLayer. A SwiftUI raster image can render underneath that layer.
private struct SetupGuidePoster: UIViewRepresentable {
    let guide: SetupGuide

    func makeUIView(context: Context) -> UIImageView {
        let view = UIImageView()
        view.contentMode = .scaleAspectFit
        view.isAccessibilityElement = false
        return view
    }

    func updateUIView(_ view: UIImageView, context: Context) {
        let name = "setup-\(guide.rawValue)-poster"
        guard view.accessibilityIdentifier != name else { return }
        view.accessibilityIdentifier = name
        view.image = Bundle.main.url(forResource: name, withExtension: "png")
            .flatMap { UIImage(contentsOfFile: $0.path) }
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UIImageView, context: Context) -> CGSize? {
        let width = proposal.width ?? 320
        return CGSize(width: width, height: width / 1.5)
    }
}

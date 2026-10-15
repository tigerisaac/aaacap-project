import AVKit
import SwiftUI

/// AVKit requires a real, visible AVPlayerLayer as the PiP source.
struct SetupGuideVideoSurface: UIViewRepresentable {
    let guidePlayer: SetupGuidePlayer

    func makeUIView(context: Context) -> PlayerView {
        let view = PlayerView()
        view.isAccessibilityElement = false
        view.accessibilityElementsHidden = true
        view.guidePlayer = guidePlayer
        view.playerLayer.player = guidePlayer.player
        return view
    }

    func updateUIView(_ view: PlayerView, context: Context) {
        view.guidePlayer = guidePlayer
        view.attachWhenVisible()
    }

    final class PlayerView: UIView {
        weak var guidePlayer: SetupGuidePlayer?
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }

        override init(frame: CGRect) {
            super.init(frame: frame)
            playerLayer.videoGravity = .resizeAspect
        }

        required init?(coder: NSCoder) { nil }

        override func layoutSubviews() {
            super.layoutSubviews()
            attachWhenVisible()
        }

        override func didMoveToWindow() {
            super.didMoveToWindow()
            attachWhenVisible()
        }

        func attachWhenVisible() {
            // SwiftUI also creates temporary views for measurement. They must
            // never replace the actual on-screen source of a floating guide.
            guard window != nil, bounds.width > 0, bounds.height > 0 else { return }
            guidePlayer?.attach(playerLayer)
        }
    }
}

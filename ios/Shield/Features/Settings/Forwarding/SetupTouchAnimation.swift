import ImageIO
import SwiftUI

/// Decode just the current GIF frame. UIImage's animated-image convenience
/// retains every decoded frame, which is wasteful on older iPhones.
struct SetupTouchAnimation: UIViewRepresentable {
    let guide: SetupGuide
    let running: Bool

    func makeUIView(context: Context) -> TouchImageView { TouchImageView(frame: .zero) }
    func updateUIView(_ view: TouchImageView, context: Context) {
        view.load(guide: guide)
        view.setRunning(running)
    }
    func sizeThatFits(_ proposal: ProposedViewSize, uiView: TouchImageView, context: Context) -> CGSize? {
        let width = proposal.width ?? 320
        return CGSize(width: width, height: width / 1.5)
    }
    static func dismantleUIView(_ view: TouchImageView, coordinator: Void) { view.setRunning(false) }

    final class TouchImageView: UIImageView {
        private var guide: SetupGuide?
        private var source: CGImageSource?
        private var frames = 0
        private var displayed = -1
        private var started: CFTimeInterval = 0
        private var displayLink: CADisplayLink?
        private let clockTarget = ClockTarget()

        override init(frame: CGRect) {
            super.init(frame: frame)
            contentMode = .scaleAspectFit
            isAccessibilityElement = false
            clockTarget.owner = self
        }
        required init?(coder: NSCoder) { nil }
        isolated deinit { displayLink?.invalidate() }

        func load(guide: SetupGuide) {
            guard self.guide != guide else { return }
            self.guide = guide
            source = Bundle.main.url(forResource: "setup-\(guide.rawValue)-inline", withExtension: "gif")
                .flatMap { CGImageSourceCreateWithURL($0 as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary) }
            frames = source.map(CGImageSourceGetCount) ?? 0
            displayed = -1
            started = CACurrentMediaTime()
            showFrame(0)
            if source == nil { image = UIImage(named: "setup-\(guide.rawValue)-poster") }
        }
        func setRunning(_ running: Bool) {
            if running, displayLink == nil {
                let link = CADisplayLink(target: clockTarget, selector: #selector(ClockTarget.tick(_:)))
                link.preferredFrameRateRange = CAFrameRateRange(minimum: 24, maximum: 24, preferred: 24)
                link.add(to: .main, forMode: .common)
                displayLink = link
            } else if !running {
                displayLink?.invalidate(); displayLink = nil
            }
        }
        fileprivate func tick(_ link: CADisplayLink) {
            guard frames > 0 else { return }
            showFrame(Int((link.timestamp - started) * 24) % frames)
        }
        private func showFrame(_ index: Int) {
            guard index >= 0, index != displayed, let source,
                  let frame = CGImageSourceCreateImageAtIndex(source, index, [kCGImageSourceShouldCache: false] as CFDictionary) else { return }
            displayed = index
            image = UIImage(cgImage: frame)
        }
    }
    @MainActor private final class ClockTarget: NSObject {
        weak var owner: TouchImageView?
        @objc func tick(_ link: CADisplayLink) { owner?.tick(link) }
    }
}

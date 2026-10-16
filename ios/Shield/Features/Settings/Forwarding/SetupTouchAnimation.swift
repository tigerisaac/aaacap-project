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
        private var decoder: FrameDecoder?
        private var frameTask: Task<Void, Never>?
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
        isolated deinit { displayLink?.invalidate(); frameTask?.cancel() }

        func load(guide: SetupGuide) {
            guard self.guide != guide else { return }
            self.guide = guide
            frameTask?.cancel(); frameTask = nil
            decoder = Bundle.main.url(forResource: "setup-\(guide.rawValue)-inline", withExtension: "gif")
                .flatMap { FrameDecoder(url: $0) }
            frames = decoder?.frameCount ?? 0
            displayed = -1
            started = CACurrentMediaTime()
            image = UIImage(named: "setup-\(guide.rawValue)-poster")
            showFrame(0)
        }
        func setRunning(_ running: Bool) {
            if running, displayLink == nil {
                let link = CADisplayLink(target: clockTarget, selector: #selector(ClockTarget.tick(_:)))
                link.preferredFrameRateRange = CAFrameRateRange(minimum: 24, maximum: 24, preferred: 24)
                link.add(to: .main, forMode: .common)
                displayLink = link
            } else if !running {
                displayLink?.invalidate(); displayLink = nil
                frameTask?.cancel(); frameTask = nil
            }
        }
        fileprivate func tick(_ link: CADisplayLink) {
            guard frames > 0 else { return }
            showFrame(Int((link.timestamp - started) * 24) % frames)
        }
        private func showFrame(_ index: Int) {
            guard index >= 0, index != displayed, frameTask == nil, let decoder else { return }
            // One in-flight frame, with no queue of obsolete animation work.
            frameTask = Task { [weak self] in
                let frame = await decoder.frame(index)
                guard !Task.isCancelled, let self, self.decoder === decoder else { return }
                self.frameTask = nil
                guard let frame else { return }
                self.displayed = index
                self.image = UIImage(cgImage: frame)
            }
        }
    }

    /// ImageIO's source stays on this actor. Rasterization completes here too,
    /// so UIImageView never has to decompress a high-resolution GIF on main.
    private actor FrameDecoder {
        private let source: CGImageSource
        let frameCount: Int

        init?(url: URL) {
            guard let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary) else { return nil }
            self.source = source
            frameCount = CGImageSourceGetCount(source)
        }

        func frame(_ index: Int) -> CGImage? {
            guard !Task.isCancelled else { return nil }
            return autoreleasepool {
                guard let frame = CGImageSourceCreateImageAtIndex(source, index, [kCGImageSourceShouldCache: false] as CFDictionary),
                      let context = CGContext(data: nil, width: frame.width, height: frame.height,
                                              bitsPerComponent: 8, bytesPerRow: 0,
                                              space: CGColorSpaceCreateDeviceRGB(),
                                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return nil }
                context.draw(frame, in: CGRect(x: 0, y: 0, width: frame.width, height: frame.height))
                return context.makeImage()
            }
        }
    }
    @MainActor private final class ClockTarget: NSObject {
        weak var owner: TouchImageView?
        @objc func tick(_ link: CADisplayLink) { owner?.tick(link) }
    }
}

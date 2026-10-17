import ImageIO
import SwiftUI

/// Keep a small runway of decoded GIF frames, rather than decoding on each
/// display deadline or retaining the entire animation on older iPhones.
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
        private var wanted = 0
        private var frameBuffer: [Int: CGImage] = [:]
        private let bufferCapacity = 5
        private var started: CFTimeInterval = 0
        private var pausedAt: CFTimeInterval?
        private var displayLink: CADisplayLink?
        private let clockTarget = ClockTarget()
        #if DEBUG
        private let metrics = SetupGuideFrameMetrics.enabled ? SetupGuideFrameMetrics() : nil
        #endif

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
            frameBuffer.removeAll()
            started = CACurrentMediaTime()
            pausedAt = displayLink == nil ? started : nil
            #if DEBUG
            metrics?.begin(guide: guide)
            #endif
            image = UIImage(named: "setup-\(guide.rawValue)-poster")
            showFrame(0)
        }
        func setRunning(_ running: Bool) {
            if running, displayLink == nil {
                // Time in another app is not time spent watching the instructions.
                if let pausedAt { started += CACurrentMediaTime() - pausedAt }
                pausedAt = nil
                let link = CADisplayLink(target: clockTarget, selector: #selector(ClockTarget.tick(_:)))
                // 30 divides both 60 Hz and 120 Hz displays evenly.
                let rate = Float(SetupGuide.animationFrameRate)
                link.preferredFrameRateRange = CAFrameRateRange(minimum: rate, maximum: rate, preferred: rate)
                link.add(to: .main, forMode: .common)
                displayLink = link
            } else if !running {
                if displayLink != nil { pausedAt = CACurrentMediaTime() }
                displayLink?.invalidate(); displayLink = nil
                frameTask?.cancel(); frameTask = nil
                #if DEBUG
                metrics?.pause()
                #endif
            }
        }
        fileprivate func tick(_ link: CADisplayLink) {
            guard frames > 0 else { return }
            #if DEBUG
            metrics?.tick(at: CACurrentMediaTime())
            #endif
            showFrame(Int((link.timestamp - started) * SetupGuide.animationFrameRate) % frames)
        }
        private func showFrame(_ index: Int) {
            guard index >= 0, frames > 0 else { return }
            wanted = index
            // Present already-rasterized pixels on the display deadline. A
            // bounded five-frame runway absorbs occasional ImageIO delays.
            frameBuffer = frameBuffer.filter { ($0.key - index + frames) % frames < bufferCapacity }
            presentBufferedFrame()
            refillBuffer()
        }

        private func presentBufferedFrame() {
            guard wanted != displayed, let frame = frameBuffer[wanted] else { return }
            displayed = wanted
            image = UIImage(cgImage: frame)
            #if DEBUG
            metrics?.presented()
            #endif
        }

        private func refillBuffer() {
            guard frameTask == nil, let decoder, frames > 0 else { return }
            let missing = (0..<bufferCapacity).map { (wanted + $0) % frames }
                .filter { frameBuffer[$0] == nil }
            // Small batches let a seek or pause cancel obsolete work promptly.
            let indices = Array(missing.prefix(2))
            guard !indices.isEmpty else { return }
            #if DEBUG
            let requestedAt = CACurrentMediaTime()
            #endif
            frameTask = Task { [weak self] in
                let decoded = await decoder.frames(indices)
                guard !Task.isCancelled, let self, self.decoder === decoder else { return }
                self.frameTask = nil
                for (index, frame) in decoded where (index - self.wanted + self.frames) % self.frames < self.bufferCapacity {
                    self.frameBuffer[index] = frame
                }
                #if DEBUG
                self.metrics?.bufferFilled(after: CACurrentMediaTime() - requestedAt)
                #endif
                self.presentBufferedFrame()
                if self.displayLink != nil { self.refillBuffer() }
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

        func frames(_ indices: [Int]) -> [(Int, CGImage)] {
            indices.compactMap { index in
                guard let image = frame(index) else { return nil }
                return (index, image)
            }
        }

        private func frame(_ index: Int) -> CGImage? {
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

#if DEBUG
import Foundation
import QuartzCore

/// Opt-in timing of our own bundled animation. No screen capture or owner data.
@MainActor
final class SetupGuideFrameMetrics {
    static var enabled: Bool { ProcessInfo.processInfo.arguments.contains("--setup-guide-frame-metrics") }
    private var guide = ""
    private var activeSeconds = 0.0
    private var previousTick: Double?
    private var previousPresentation: Double?
    private var tickGaps: [Double] = []
    private var presentationGaps: [Double] = []
    private var bufferFillTimes: [Double] = []
    private var presentedFrames = 0
    private var finished = false

    func begin(guide: SetupGuide) {
        self.guide = guide.rawValue
        activeSeconds = 0
        previousTick = nil
        previousPresentation = nil
        tickGaps = []
        presentationGaps = []
        bufferFillTimes = []
        presentedFrames = 0
        finished = false
    }

    func pause() { previousTick = nil; previousPresentation = nil }

    func tick(at now: Double) {
        guard !finished else { return }
        if let previousTick {
            let elapsed = now - previousTick
            tickGaps.append(elapsed)
            activeSeconds += elapsed
        }
        previousTick = now
        guard activeSeconds >= 40 else { return }
        finished = true
        let budget = 1 / SetupGuide.animationFrameRate
        let report: [String: Any] = [
            "guide": guide, "elapsedSeconds": activeSeconds,
            "requestedFramesPerSecond": SetupGuide.animationFrameRate,
            "tickCount": tickGaps.count + 1, "presentedFrames": presentedFrames,
            "maxTickGapMs": (tickGaps.max() ?? 0) * 1000,
            "tickGapsOver1_5FrameBudgets": tickGaps.filter { $0 > budget * 1.5 }.count,
            "maxPresentationGapMs": (presentationGaps.max() ?? 0) * 1000,
            "presentationGapsOver1_5FrameBudgets": presentationGaps.filter { $0 > budget * 1.5 }.count,
            "p95BufferFillMs": percentile95(bufferFillTimes) * 1000,
            "maxBufferFillMs": (bufferFillTimes.max() ?? 0) * 1000,
            "bufferFillsOverFrameBudget": bufferFillTimes.filter { $0 > budget }.count
        ]
        guard let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first,
              let data = try? JSONSerialization.data(withJSONObject: report, options: [.sortedKeys, .prettyPrinted]) else { return }
        try? data.write(to: folder.appendingPathComponent("shield-setup-guide-frame-metrics-\(guide).json"), options: .atomic)
    }

    func bufferFilled(after duration: Double) {
        guard !finished else { return }
        bufferFillTimes.append(duration)
    }

    func presented() {
        guard !finished else { return }
        let now = CACurrentMediaTime()
        presentedFrames += 1
        if let previousPresentation { presentationGaps.append(now - previousPresentation) }
        previousPresentation = now
    }

    private func percentile95(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0 }
        let sorted = values.sorted()
        return sorted[min(sorted.count - 1, Int(Double(sorted.count - 1) * 0.95))]
    }
}
#endif

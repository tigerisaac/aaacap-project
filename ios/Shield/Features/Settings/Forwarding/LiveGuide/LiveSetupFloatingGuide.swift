#if DEBUG
import AVKit
import CoreImage
import Observation
import UIKit

/// Sends only locally drawn instruction cards to PiP, never the captured screen.
@MainActor @Observable
final class LiveSetupFloatingGuide: NSObject, @MainActor AVPictureInPictureControllerDelegate,
    @MainActor AVPictureInPictureSampleBufferPlaybackDelegate {
    private(set) var floating = false
    @ObservationIgnored private weak var layer: AVSampleBufferDisplayLayer?
    @ObservationIgnored private var pip: AVPictureInPictureController?
    @ObservationIgnored private let imageContext = CIContext()
    @ObservationIgnored private var instruction: LiveSetupInstruction = .waiting
    @ObservationIgnored private var heartbeat: Task<Void, Never>?
    @ObservationIgnored private var audioToken: UUID?
    @ObservationIgnored var onClose: (@MainActor () -> Void)?

    func attach(_ layer: AVSampleBufferDisplayLayer) {
        guard self.layer !== layer else { return }
        self.layer = layer
        var timebase: CMTimebase?
        CMTimebaseCreateWithSourceClock(allocator: kCFAllocatorDefault, sourceClock: CMClockGetHostTimeClock(), timebaseOut: &timebase)
        if let timebase {
            CMTimebaseSetTime(timebase, time: CMClockGetTime(CMClockGetHostTimeClock()))
            CMTimebaseSetRate(timebase, rate: 1)
            layer.controlTimebase = timebase
        }
        let source = AVPictureInPictureController.ContentSource(sampleBufferDisplayLayer: layer, playbackDelegate: self)
        pip = AVPictureInPictureController(contentSource: source)
        pip?.delegate = self
        pip?.requiresLinearPlayback = true
        pip?.canStartPictureInPictureAutomaticallyFromInline = false
        draw()
    }

    func show(_ instruction: LiveSetupInstruction) {
        self.instruction = instruction
        draw()
    }

    func start() async -> Bool {
        for _ in 0..<20 {
            if pip != nil { break }
            do { try await Task.sleep(for: .milliseconds(50)) } catch { return false }
        }
        guard let pip else { return false }
        let token = UUID()
        audioToken = token
        do { try await MessageAudioSession.shared.activate(token, videoGuide: true) } catch { return false }
        guard audioToken == token, !Task.isCancelled else { return false }
        draw()
        heartbeat = Task { [weak self] in
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(1)) } catch { return }
                self?.draw()
            }
        }
        for _ in 0..<30 {
            guard audioToken == token, !Task.isCancelled else { return false }
            if pip.isPictureInPicturePossible { break }
            try? await Task.sleep(for: .milliseconds(50))
        }
        guard pip.isPictureInPicturePossible else { stop(); return false }
        pip.startPictureInPicture()
        for _ in 0..<30 {
            guard audioToken == token, !Task.isCancelled else { return false }
            if pip.isPictureInPictureActive { return true }
            try? await Task.sleep(for: .milliseconds(50))
        }
        stop()
        return false
    }

    func stop() {
        heartbeat?.cancel()
        heartbeat = nil
        floating = false
        pip?.stopPictureInPicture()
        if let token = audioToken {
            audioToken = nil
            Task { await MessageAudioSession.shared.deactivate(token) }
        }
    }

    private func draw() {
        guard let layer else { return }
        let size = CGSize(width: 1080, height: 600)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let image = UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor(red: 0.035, green: 0.085, blue: 0.14, alpha: 1).setFill()
            context.fill(CGRect(origin: .zero, size: size))
            let paragraph = NSMutableParagraphStyle()
            paragraph.lineBreakMode = .byWordWrapping
            let icon = UIImage(systemName: instruction.symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 86, weight: .semibold))?
                .withTintColor(UIColor(red: 0.73, green: 0.83, blue: 0.99, alpha: 1), renderingMode: .alwaysOriginal)
            icon?.draw(in: CGRect(x: 52, y: 52, width: 90, height: 90))
            (instruction.title as NSString).draw(in: CGRect(x: 52, y: 180, width: 976, height: 170), withAttributes: [
                .font: UIFont.systemFont(ofSize: 76, weight: .semibold), .foregroundColor: UIColor.white, .paragraphStyle: paragraph
            ])
            (instruction.detail as NSString).draw(in: CGRect(x: 52, y: 370, width: 976, height: 190), withAttributes: [
                .font: UIFont.systemFont(ofSize: 54), .foregroundColor: UIColor.white, .paragraphStyle: paragraph
            ])
        }
        guard let cgImage = image.cgImage else { return }
        var buffer: CVPixelBuffer?
        let attributes: [CFString: Any] = [kCVPixelBufferIOSurfacePropertiesKey: [:]]
        guard CVPixelBufferCreate(kCFAllocatorDefault, 1080, 600, kCVPixelFormatType_32BGRA,
                                  attributes as CFDictionary, &buffer) == kCVReturnSuccess,
              let buffer else { return }
        imageContext.render(CIImage(cgImage: cgImage), to: buffer)
        var description: CMVideoFormatDescription?
        guard CMVideoFormatDescriptionCreateForImageBuffer(allocator: kCFAllocatorDefault,
                  imageBuffer: buffer, formatDescriptionOut: &description) == noErr, let description else { return }
        var timing = CMSampleTimingInfo(duration: CMTime(value: 1, timescale: 1),
            presentationTimeStamp: CMClockGetTime(CMClockGetHostTimeClock()), decodeTimeStamp: .invalid)
        var sample: CMSampleBuffer?
        guard CMSampleBufferCreateReadyWithImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: buffer,
                  formatDescription: description, sampleTiming: &timing, sampleBufferOut: &sample) == noErr,
              let sample else { return }
        CMSetAttachment(sample, key: kCMSampleAttachmentKey_DisplayImmediately, value: kCFBooleanTrue, attachmentMode: kCMAttachmentMode_ShouldPropagate)
        if layer.sampleBufferRenderer.status == .failed { layer.sampleBufferRenderer.flush() }
        layer.sampleBufferRenderer.enqueue(sample)
    }

    func pictureInPictureControllerDidStartPictureInPicture(_ controller: AVPictureInPictureController) { floating = true }
    func pictureInPictureControllerDidStopPictureInPicture(_ controller: AVPictureInPictureController) {
        let wasFloating = floating
        floating = false
        if wasFloating { onClose?() }
    }
    func pictureInPictureController(_ controller: AVPictureInPictureController, failedToStartPictureInPictureWithError error: any Error) {
        stop()
        onClose?()
    }
    func pictureInPictureController(_ controller: AVPictureInPictureController,
        restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void) { completionHandler(true) }
    func pictureInPictureController(_ controller: AVPictureInPictureController, setPlaying playing: Bool) {
        if !playing && floating { onClose?() }
    }
    func pictureInPictureControllerTimeRangeForPlayback(_ controller: AVPictureInPictureController) -> CMTimeRange {
        CMTimeRange(start: .zero, duration: .positiveInfinity)
    }
    func pictureInPictureControllerIsPlaybackPaused(_ controller: AVPictureInPictureController) -> Bool { false }
    func pictureInPictureController(_ controller: AVPictureInPictureController, didTransitionToRenderSize newRenderSize: CMVideoDimensions) { }
    func pictureInPictureController(_ controller: AVPictureInPictureController, skipByInterval skipInterval: CMTime, completion: @escaping () -> Void) { completion() }
    func pictureInPictureControllerShouldProhibitBackgroundAudioPlayback(_ controller: AVPictureInPictureController) -> Bool { true }
}
#endif

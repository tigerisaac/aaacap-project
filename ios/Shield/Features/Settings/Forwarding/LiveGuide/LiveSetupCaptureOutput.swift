#if DEBUG && !targetEnvironment(simulator)
import CoreMedia
import ImageIO
@preconcurrency import ScreenCaptureKit
import Vision

@available(iOS 27.0, *)
final class LiveSetupCaptureOutput: NSObject, SCStreamOutput, @unchecked Sendable {
    let queue = DispatchQueue(label: "org.shield.setup-labels", qos: .userInitiated)
    private let receive: @Sendable ([LiveSetupObservation]) -> Void
    // Accessed exclusively on the serial sample queue. No pixel buffer is retained.
    private var lastFrame: CFAbsoluteTime = 0

    init(receive: @escaping @Sendable ([LiveSetupObservation]) -> Void) {
        self.receive = receive
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen, CMSampleBufferIsValid(sampleBuffer),
              CFAbsoluteTimeGetCurrent() - lastFrame >= 0.8,
              let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        lastFrame = CFAbsoluteTimeGetCurrent()
        autoreleasepool {
            let attachments = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]]
            let rawOrientation = (attachments?.first?[.videoOrientation] as? NSNumber)?.uint32Value ?? 1
            let orientation = CGImagePropertyOrientation(rawValue: rawOrientation) ?? .up
            do {
                let handler = VNImageRequestHandler(cvPixelBuffer: pixels, orientation: orientation)
                receive(try LiveSetupTextRecognition.observations(using: handler))
            } catch {
                receive([])
            }
        }
    }
}
#endif

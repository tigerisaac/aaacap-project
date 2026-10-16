#if DEBUG
import Vision

/// The exact OCR pipeline used by live capture and synthetic-image checks.
enum LiveSetupTextRecognition {
    static func observations(using handler: VNImageRequestHandler) throws -> [LiveSetupObservation] {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = true
        request.customWords = ["Phone", "Screen Unknown Callers", "Never", "Ask Reason for Calling", "Silence", "Call Filtering", "Live Voicemail"]
        request.minimumTextHeight = 0.01
        try handler.perform([request])
        return (request.results ?? []).compactMap { result in
            guard let candidate = result.topCandidates(1).first, candidate.confidence >= 0.75 else { return nil }
            let bounds = result.boundingBox
            return LiveSetupObservation(recognizedText: candidate.string,
                bounds: CGRect(x: bounds.minX, y: 1 - bounds.maxY, width: bounds.width, height: bounds.height))
        }
    }
}
#endif

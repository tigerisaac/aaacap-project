import Foundation
import Vision

enum ImageTextExtractionError: LocalizedError {
    case tooLarge, unreadable, noText

    var errorDescription: String? {
        switch self {
        case .tooLarge: "This image is too large. Try a smaller screenshot."
        case .unreadable: "Couldn’t read this image. Try another screenshot."
        case .noText: "No text found. Try another screenshot or paste the message."
        }
    }
}

enum ImageTextExtractor {
    static func text(from data: Data) async throws -> String {
        guard data.count <= 25 * 1024 * 1024 else { throw ImageTextExtractionError.tooLarge }
        return try await Task.detached(priority: .userInitiated) {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            do { try VNImageRequestHandler(data: data).perform([request]) }
            catch { throw ImageTextExtractionError.unreadable }
            let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { throw ImageTextExtractionError.noText }
            return text
        }.value
    }
}

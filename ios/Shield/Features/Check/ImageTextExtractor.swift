import Foundation
import Vision

enum ImageTextExtractor {
    static func text(from data: Data) async throws -> String {
        guard data.count <= 25 * 1024 * 1024 else { throw APIError.invalidResponse }
        return try await Task.detached(priority: .userInitiated) {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            try VNImageRequestHandler(data: data).perform([request])
            return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
        }.value
    }
}

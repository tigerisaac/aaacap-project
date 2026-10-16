#if DEBUG
import Foundation
import Vision

struct LiveSetupPracticeCheck: Sendable {
    let passed: Int
    let total: Int
    let slowestMilliseconds: Int
    let failureDetail: String

    static func run(_ fixtures: [LiveSetupPracticeImages.Fixture]) -> Self {
        var passed = 0
        var slowest = 0.0
        var failures: [String] = []
        for fixture in fixtures {
            let start = CFAbsoluteTimeGetCurrent()
            do {
                let labels = try LiveSetupTextRecognition.observations(using: VNImageRequestHandler(cgImage: fixture.image))
                let instruction = LiveSetupRecognition.instruction(for: labels)
                if instruction == fixture.expected { passed += 1 }
                else {
                    let publicGeometry = labels.map { "\($0.label.rawValue):\(String(format: "%.2f,%.2f,%.2f,%.2f", $0.bounds.minX, $0.bounds.minY, $0.bounds.width, $0.bounds.height))" }.joined(separator: ";")
                    failures.append("\(fixture.name)=\(instruction.rawValue) [\(publicGeometry)]")
                }
            } catch { }
            slowest = max(slowest, CFAbsoluteTimeGetCurrent() - start)
        }
        return Self(passed: passed, total: fixtures.count, slowestMilliseconds: Int(slowest * 1000), failureDetail: failures.joined(separator: " | "))
    }
}
#endif

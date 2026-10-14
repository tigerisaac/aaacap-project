#if DEBUG && targetEnvironment(simulator)
import Foundation

enum PreviewAudio {
    private static var duration: Int {
        ProcessInfo.processInfo.arguments.contains("--uitesting-long-audio") ? 180 : 20
    }

    static let call = CallRecord(id: UUID(), occurredAt: .now, callerNumber: "+12025550100", title: "Sample audio message",
        outcome: .voicemail, reasonCode: "sample", detail: "Synthetic audio for checking playback controls.", nextStep: "No action is needed.",
        acceptedAt: nil, endedAt: .now, voicemail: Voicemail(id: UUID(), duration: duration, status: "ready", heardAt: nil,
            summary: "Synthetic audio for checking pause and resume.", summaryStatus: "ready", decision: "keep"))

    /// A quiet test tone. A longer fixture leaves time for slow spoken-focus automation.
    /// Generated locally; no recording or external service.
    static var data: Data {
        let frames = duration * 8_000
        var output = Data("RIFF".utf8)
        append(UInt32(36 + frames * 2), to: &output)
        output.append(contentsOf: "WAVEfmt ".utf8)
        append(UInt32(16), to: &output)
        append(UInt16(1), to: &output)
        append(UInt16(1), to: &output)
        append(UInt32(8_000), to: &output)
        append(UInt32(16_000), to: &output)
        append(UInt16(2), to: &output)
        append(UInt16(16), to: &output)
        output.append(contentsOf: "data".utf8)
        append(UInt32(frames * 2), to: &output)
        for index in 0..<frames {
            let sample = Int16(sin(Double(index) * 2 * .pi * 440 / 8_000) * 800)
            append(UInt16(bitPattern: sample), to: &output)
        }
        return output
    }

    private static func append<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
        var littleEndian = value.littleEndian
        withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
    }
}
#endif

import Foundation
import CoreGraphics

/// Only exact public Settings labels leave the OCR queue. Other text is discarded.
struct LiveSetupObservation: Sendable {
    enum Label: String, Sendable {
        case phone = "phone"
        case screenUnknownCallers = "screen unknown callers"
        case screenUnknown = "screen unknown"
        case screenWord = "screen"
        case unknownWord = "unknown"
        case unknownCallers = "unknown callers"
        case callers
        case never
        case ask = "ask reason for calling"
        case askReasonFor = "ask reason for"
        case askReason = "ask reason"
        case askWord = "ask"
        case forCalling = "for calling"
        case reasonForCalling = "reason for calling"
        case reasonFor = "reason for"
        case forWord = "for"
        case calling
        case silence
        case callFiltering = "call filtering"
        case liveVoicemail = "live voicemail"
    }

    let label: Label
    /// Normalized top-left coordinates, independent of capture resolution.
    let bounds: CGRect

    init(label: Label, bounds: CGRect) {
        self.label = label
        self.bounds = bounds
    }

    init?(recognizedText: String, bounds: CGRect) {
        let normalized = recognizedText.lowercased().split(whereSeparator: \.isWhitespace).joined(separator: " ")
        guard let label = Label(rawValue: normalized) else { return nil }
        self.init(label: label, bounds: bounds)
    }
}

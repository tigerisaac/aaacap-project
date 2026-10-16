import Foundation

/// Geometry matters: a floating illustration must never masquerade as Settings.
enum LiveSetupRecognition {
    static func instruction(for observations: [LiveSetupObservation]) -> LiveSetupInstruction {
        typealias Label = LiveSetupObservation.Label
        func matches(_ label: Label) -> [LiveSetupObservation] { observations.filter { $0.label == label } }
        // The real navigation title stays centered near the top. Search results,
        // Phone history, and the inline tutorial cannot satisfy the whole layout.
        guard matches(.phone).contains(where: {
            $0.bounds.minY < 0.16 && $0.bounds.midX > 0.35 && $0.bounds.midX < 0.65
        }) else { return .waiting }

        var headings = matches(.screenUnknownCallers)
        for first in matches(.screenUnknown) {
            for second in matches(.callers) where abs(first.bounds.minX - second.bounds.minX) < 0.08 &&
                second.bounds.minY >= first.bounds.maxY && second.bounds.minY - first.bounds.maxY < 0.05 {
                headings.append(.init(label: .screenUnknownCallers, bounds: first.bounds.union(second.bounds)))
            }
        }
        for heading in headings where heading.bounds.minY > 0.16 {
            for never in matches(.never) where never.bounds.minY > heading.bounds.maxY {
                for ask in matches(.ask) where ask.bounds.minY > never.bounds.maxY {
                    for silence in matches(.silence) where silence.bounds.minY > ask.bounds.maxY && silence.bounds.maxY < 0.94 {
                        let lefts = [never.bounds.minX, ask.bounds.minX, silence.bounds.minX]
                        guard (lefts.max()! - lefts.min()!) < 0.08,
                              silence.bounds.minY - never.bounds.maxY < 0.40 else { continue }
                        return .chooseSilence
                    }
                }
            }
        }
        if !headings.isEmpty { return .slowDown }
        if !matches(.callFiltering).isEmpty && matches(.liveVoicemail).isEmpty { return .slideDown }
        return .slideUp
    }
}

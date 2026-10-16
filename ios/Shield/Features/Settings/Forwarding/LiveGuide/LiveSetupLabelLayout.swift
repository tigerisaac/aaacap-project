import Foundation

/// Reassembles only known public labels split into adjacent lines by Dynamic Type.
/// Arbitrary recognized text never enters this layer.
enum LiveSetupLabelLayout {
    static func matches(_ label: LiveSetupObservation.Label, in observations: [LiveSetupObservation]) -> [LiveSetupObservation] {
        typealias Label = LiveSetupObservation.Label
        let alternatives: [[Label]]
        switch label {
        case .screenUnknownCallers:
            alternatives = [[.screenUnknown, .callers], [.screenWord, .unknownCallers], [.screenWord, .unknownWord, .callers]]
        case .ask:
            alternatives = [[.askReasonFor, .calling], [.askReason, .forCalling], [.askWord, .reasonForCalling],
                            [.askWord, .reasonFor, .calling], [.askReason, .forWord, .calling]]
        default:
            alternatives = []
        }
        var matches = observations.filter { $0.label == label }.prefix(8).map { $0 }
        for parts in alternatives {
            var candidates = observations.filter { $0.label == parts[0] }.prefix(8).map { $0.bounds }
            for part in parts.dropFirst() {
                let lines = observations.filter { $0.label == part }.prefix(8)
                candidates = Array(candidates.flatMap { previous in
                    lines.compactMap { next in
                        guard abs(previous.minX - next.bounds.minX) < 0.08,
                              next.bounds.minY >= previous.maxY,
                              next.bounds.minY - previous.maxY < 0.05 else { return nil }
                        return previous.union(next.bounds)
                    }
                }.prefix(8))
            }
            matches += candidates.map { .init(label: label, bounds: $0) }
        }
        return Array(matches.prefix(8))
    }
}

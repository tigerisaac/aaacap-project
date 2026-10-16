import Foundation

@main struct RecognitionChecks {
    static func main() {
        typealias O = LiveSetupObservation
        func label(_ value: O.Label, _ x: Double, _ y: Double, _ width: Double = 0.6) -> O {
            O(label: value, bounds: CGRect(x: x, y: y, width: width, height: 0.025))
        }
        let phone = label(.phone, 0.43, 0.08, 0.14)
        let root = [phone, label(.liveVoicemail, 0.10, 0.8)]
        let target = [phone, label(.screenUnknownCallers, 0.10, 0.32),
                      label(.never, 0.13, 0.40), label(.ask, 0.13, 0.47), label(.silence, 0.13, 0.54)]
        var checks = 0
        func expect(_ value: LiveSetupInstruction, _ observations: [O], _ name: String) {
            precondition(LiveSetupRecognition.instruction(for: observations) == value, name)
            checks += 1
        }
        expect(.waiting, [], "Empty frames do not guide")
        expect(.slideUp, root, "Phone root needs upward finger motion")
        expect(.chooseSilence, target, "Complete native choices stop the scroll")
        expect(.waiting, Array(target.dropFirst()), "Target artwork without native Phone title is ignored")
        expect(.waiting, [label(.phone, 0.43, 0.4, 0.14)] + Array(target.dropFirst()), "Inline GIF is ignored")
        expect(.waiting, [label(.phone, 0.05, 0.08, 0.14)] + Array(target.dropFirst()), "Search result is not a navigation title")
        expect(.slowDown, target.filter { $0.label != .silence }, "Partly clipped choices cannot say stop")
        expect(.slowDown, target.filter { $0.label != .ask }, "Never and Silence alone are insufficient")
        expect(.slideDown, [phone, label(.callFiltering, 0.1, 0.4)], "Overshoot corrects the finger direction")
        expect(.chooseSilence, [phone, label(.screenUnknown, 0.1, 0.26), label(.callers, 0.1, 0.29)] + Array(target.suffix(3)), "Wrapped large-text heading is supported")
        expect(.slowDown, Array(target.prefix(4)) + [label(.silence, 0.13, 0.95)], "Offscreen tap target is not actionable")
        expect(.slowDown, Array(target.prefix(4)) + [label(.silence, 0.55, 0.54)], "Unrelated floating text cannot complete the group")
        let wrappedAsk = target.filter { $0.label != .ask } + [label(.askReasonFor, 0.13, 0.46), label(.calling, 0.13, 0.49)]
        expect(.chooseSilence, wrappedAsk, "Two-line action label is supported")
        expect(.chooseSilence, target.filter { $0.label != .ask } + [label(.askReason, 0.13, 0.46), label(.forCalling, 0.13, 0.49)], "Alternative native line break is supported")
        expect(.slowDown, target.filter { $0.label != .ask } + [label(.calling, 0.13, 0.46), label(.askReasonFor, 0.13, 0.49)], "Reversed fragments never form an action label")
        expect(.slowDown, target.filter { $0.label != .ask } + [label(.askReasonFor, 0.13, 0.46), label(.calling, 0.50, 0.49)], "Text in a different column is not joined")
        expect(.slowDown, target.filter { $0.label != .ask } + [label(.askReasonFor, 0.13, 0.35), label(.calling, 0.13, 0.48)], "Widely separated fragments are not joined")
        precondition(O(recognizedText: "A private caller or number", bounds: .zero) == nil)
        checks += 1
        var stable = LiveSetupStability()
        precondition(stable.update(.chooseSilence) == .slowDown)
        precondition(stable.update(.chooseSilence) == .chooseSilence)
        precondition(stable.update(.slideUp) == .slideUp)
        precondition(stable.update(.chooseSilence) == .slowDown)
        checks += 4
        print("Passed \(checks) Settings recognition checks (synthetic layouts only).")
    }
}

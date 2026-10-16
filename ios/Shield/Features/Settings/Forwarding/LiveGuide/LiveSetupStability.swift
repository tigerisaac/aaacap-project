import Foundation

/// A transient frame cannot say “stop”. Moving away clears that advice immediately.
struct LiveSetupStability {
    private var previous: LiveSetupInstruction?
    private var count = 0

    mutating func update(_ next: LiveSetupInstruction) -> LiveSetupInstruction {
        if next == previous { count += 1 } else { previous = next; count = 1 }
        if next == .chooseSilence && count < 2 { return .slowDown }
        return next
    }
}

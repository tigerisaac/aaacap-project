import Foundation

/// Opt-in lifecycle events only; never screen content, settings values or phone data.
@MainActor
enum SetupGuideTrace {
    static func record(_ event: String) {
        #if DEBUG
        guard ProcessInfo.processInfo.arguments.contains("--setup-guide-trace") else { return }
        print("SHIELD_GUIDE \(ProcessInfo.processInfo.systemUptime) \(event)")
        #endif
    }
}

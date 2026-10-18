import Foundation

/// Offline simulator fixtures. These never apply to a signed-in account, device or Release build.
enum PreviewScenario {
    static func emptyData(_ screen: String, preview: Bool) -> Bool {
        #if DEBUG && targetEnvironment(simulator)
        requested(screen, preview: preview) && ProcessInfo.processInfo.arguments.contains("--uitesting-empty-data")
        #else
        false
        #endif
    }

    static func requested(_ screen: String, preview: Bool) -> Bool {
        #if DEBUG && targetEnvironment(simulator)
        guard preview else { return false }
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--uitesting-screen"), arguments.indices.contains(index + 1) else { return false }
        return arguments[index + 1] == screen
        #else
        return false
        #endif
    }

    static func loadFailure(_ screen: String, attempt: Int, preview: Bool) -> String? {
        #if DEBUG && targetEnvironment(simulator)
        if requested(screen, preview: preview), attempt == 0, ProcessInfo.processInfo.arguments.contains("--uitesting-load-failure") {
            return "Your connection was interrupted. Please try again."
        }
        #endif
        return nil
    }
}

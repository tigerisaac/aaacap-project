import CallKit
import Foundation

/// Keeps the phone's Call Directory in step with the person's Shield blocklist. The server already ends these
/// numbers' forwarded calls; this also stops ones that would ring her directly because she saved or called them.
@MainActor
enum CallDirectorySync {
    static var extensionID: String { (Bundle.main.bundleIdentifier ?? "") + ".CallDirectory" }

    static let coordinator = CallDirectoryCoordinator(fileURL: CallDirectoryList.fileURL) {
        if try await CXCallDirectoryManager.sharedInstance.enabledStatusForExtension(withIdentifier: extensionID) == .disabled { return false }
        try await CXCallDirectoryManager.sharedInstance.reloadExtension(withIdentifier: extensionID)
        return true
    }

    /// nil when iOS can't say (for example in the simulator).
    static func isEnabled() async -> Bool? {
        guard let status = try? await CXCallDirectoryManager.sharedInstance.enabledStatusForExtension(withIdentifier: extensionID) else { return nil }
        switch status {
        case .enabled: return true
        case .disabled: return false
        default: return nil
        }
    }

    static func openSettings() async { try? await CXCallDirectoryManager.sharedInstance.openSettings() }
}

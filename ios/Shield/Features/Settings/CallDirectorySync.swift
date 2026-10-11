import CallKit
import Foundation

/// Keeps the phone's Call Directory in step with the person's Shield blocklist. The server already ends these
/// numbers' forwarded calls; this also stops ones that would ring her directly because she saved or called them.
enum CallDirectorySync {
    static var extensionID: String { (Bundle.main.bundleIdentifier ?? "") + ".CallDirectory" }

    static func update(phones: [String]) async {
        do {
            if try CallDirectoryList(phones: phones).save() {
                try await CXCallDirectoryManager.sharedInstance.reloadExtension(withIdentifier: extensionID)
            }
        } catch {
            // Usually the extension isn't turned on yet. iOS loads the saved list itself when it is.
        }
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

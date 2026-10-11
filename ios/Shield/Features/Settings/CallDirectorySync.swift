import CallKit
import Foundation

/// Keeps the phone's Call Directory in step with the person's Shield blocklist. The server already ends these
/// numbers' forwarded calls; this also stops ones that would ring her directly because she saved or called them.
enum CallDirectorySync {
    static var extensionID: String { (Bundle.main.bundleIdentifier ?? "") + ".CallDirectory" }

    private static let checkNumberKey = "shield-setup-check-number"

    /// Blocked numbers changed; keep the last known check number's label.
    static func update(phones: [String]) async {
        await write(phones: phones, checkNumber: UserDefaults.standard.string(forKey: checkNumberKey))
    }

    /// `checkNumber` is Shield's daily setup check, named "Shield check" so the missed call in Recents makes sense.
    static func update(phones: [String], checkNumber: String?) async {
        UserDefaults.standard.set(checkNumber, forKey: checkNumberKey)
        await write(phones: phones, checkNumber: checkNumber)
    }

    private static func write(phones: [String], checkNumber: String?) async {
        do {
            if try CallDirectoryList(phones: phones, labels: checkNumber.map { [$0: "Shield check"] } ?? [:]).save() {
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

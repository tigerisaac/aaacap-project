import CallKit
import UIKit

@MainActor
enum PhoneSettingsLink {
    static var preferredDestination: PhoneSettingsDestination {
        if #available(iOS 27, *) { .phoneControls } else { .callIdentification }
    }

    static func open() async -> PhoneSettingsDestination {
        // Public CallKit shortcut. On the tested iOS 27 phone it scrolls Phone
        // to Call Filtering, directly BELOW the controls needed by setup.
        // URL acceptance cannot establish a viewport or confirm a setting.
        do {
            try await CXCallDirectoryManager.sharedInstance.openSettings()
            return preferredDestination
        } catch {}
        if let url = URL(string: UIApplication.openSettingsURLString), await UIApplication.shared.open(url) { return .shield }
        return .unavailable
    }
}

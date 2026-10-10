import CallKit
import UIKit

@MainActor
enum PhoneSettingsLink {
    static var preferredDestination: PhoneSettingsDestination {
        #if DEBUG
        .phone
        #else
        .callIdentification
        #endif
    }

    static func open() async -> PhoneSettingsDestination {
        #if DEBUG
        // Best effort for the installed development pilot only. This is not a
        // documented App Store API. A true return means the URL was accepted,
        // not that a particular settings page or switch was inspected.
        if let url = URL(string: "App-prefs:com.apple.mobilephone"), await UIApplication.shared.open(url) { return .phone }
        #endif
        // Public CallKit API lands one page inside Phone settings.
        do {
            try await CXCallDirectoryManager.sharedInstance.openSettings()
            return .callIdentification
        } catch {}
        if let url = URL(string: UIApplication.openSettingsURLString), await UIApplication.shared.open(url) { return .shield }
        return .unavailable
    }
}

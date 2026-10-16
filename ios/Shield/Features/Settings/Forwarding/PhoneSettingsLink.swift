import UIKit

@MainActor
enum PhoneSettingsLink {
    static var preferredDestination: PhoneSettingsDestination { .phone }

    static func open() async -> PhoneSettingsDestination {
        // Best effort: this URL is undocumented. Verified from Shield on the
        // pilot iPhone; it opens Phone, not the individual caller section.
        // Never substitute CallKit’s unrelated identification page on failure.
        guard let url = URL(string: "App-prefs:com.apple.mobilephone"),
              await UIApplication.shared.open(url) else { return .unavailable }
        return .phone
    }
}

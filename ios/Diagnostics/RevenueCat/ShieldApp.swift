#if SHIELD_REVENUECAT_TEST_STORE && DEBUG && targetEnvironment(simulator)
import SwiftUI

/// The SDK verification script substitutes this entry point in a temporary copy.
/// It never starts Shield's API, authentication, notifications or telephone service.
@main
struct RevenueCatSDKVerificationApp: App {
    var body: some Scene {
        WindowGroup { RevenueCatSDKVerificationView() }
    }
}
#else
#error("RevenueCat verification requires the dedicated Debug simulator build")
#endif

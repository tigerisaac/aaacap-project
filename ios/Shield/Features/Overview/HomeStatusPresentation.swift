import Foundation

/// Confirmed configuration is separate from transport health. This never proves carrier forwarding.
struct HomeStatusPresentation {
    let title: String
    let detail: String
    let symbol: String
    var retry = false
    var needsSetup = false
    var actionTitle = "Set up my phone"
    var useSetupMenu = false
    var enabled = false
    var isSaved = false

    static func make(status: ForwardingStatus?, checkedAt: Date?, accountStatus: String?,
                     checking: Bool, updateFailed: Bool, now: Date) -> Self {
        // Explicit known changes outrank a previously enabled forwarding snapshot.
        if status?.restorationRequested == true || accountStatus == "restoring" {
            return .init(title: "Disconnecting Shield", detail: "Finish the steps to bring back ordinary calls.", symbol: "arrow.uturn.backward.circle", needsSetup: true, actionTitle: "Finish disconnecting")
        }
        if accountStatus == "paused" {
            return .init(title: "Call checks are paused", detail: "Your phone may still send calls to Shield.", symbol: "pause.circle", needsSetup: true, actionTitle: "Resume call checks", useSetupMenu: true)
        }
        guard let status, let checkedAt else {
            return .init(title: checking ? "Getting your phone settings…" : "Connect to check your setup",
                         detail: "Your phone’s setup status will appear here.", symbol: "phone", retry: !checking)
        }
        let age = max(0, now.timeIntervalSince(checkedAt))
        guard age < 24 * 60 * 60 else {
            return .init(title: "Confirm your call settings", detail: "Connect to update Shield’s last confirmed setting.", symbol: "arrow.clockwise", retry: true, isSaved: true)
        }
        var result: Self
        if status.setupReviewRequired == true || !status.consented || !status.prepared || !status.phoneVerified {
            result = .init(title: "Your phone needs setup", detail: "We’ll help you one step at a time.", symbol: "phone.badge.checkmark", needsSetup: true)
        } else if status.alwaysOn == true, status.liveScreening == true {
            result = .init(title: "Call checks are on", detail: "Shield checks calls that reach it. Quiet hours and daily limits may send callers to voicemail.", symbol: "checkmark.shield.fill", enabled: true)
        } else if status.active, status.liveScreening == true, let expiry = status.expiresAt, expiry > now, status.remainingCalls > 0 {
            result = .init(title: "Call checks are on", detail: "Calls that reach Shield are checked until \(expiry.formatted(date: .omitted, time: .shortened)).", symbol: "checkmark.shield.fill", enabled: true)
        } else {
            result = .init(title: "Call checks are off", detail: "Calls that reach Shield may go to voicemail.", symbol: "pause.circle", needsSetup: true, actionTitle: "Phone options", useSetupMenu: true)
        }
        result.isSaved = updateFailed || age >= 300
        return result
    }
}

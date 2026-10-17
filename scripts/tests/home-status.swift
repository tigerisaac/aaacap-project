import Foundation

func testHomeStatusAndCallFilters() throws {
    let now = Date.now
    func status(alwaysOn: Bool = true, live: Bool = true, expiry: Date? = nil, remaining: Int = 10) -> ForwardingStatus {
        .init(participantId: UUID(), carrier: "Synthetic", phone: "Synthetic", shieldNumber: "Synthetic",
              liveScreening: live, alwaysOn: alwaysOn, prepared: true, active: true, expiresAt: expiry,
              remainingCalls: remaining, consentVersion: "test", consented: true, phoneVerified: true,
              stage: "checks", restorationRequested: false, lastTestAt: nil, activationCodes: [], restorationSteps: [], readiness: "", latestEvents: [])
    }
    func show(_ value: ForwardingStatus?, age: TimeInterval = 0, failed: Bool = false, account: String? = nil) -> HomeStatusPresentation {
        .make(status: value, checkedAt: value == nil ? nil : now.addingTimeInterval(-age), accountStatus: account,
              checking: false, updateFailed: failed, now: now)
    }
    let active = status()
    try require(show(active, age: 76).enabled, "75-second age must not turn known settings into a failure")
    try require(show(active, age: 120, failed: true).enabled, "transport failure must retain confirmed configuration")
    try require(show(active, age: 120, failed: true).isSaved, "failed refresh must identify last confirmation")
    try require(!show(nil).enabled, "missing settings must not claim checks are on")
    try require(!show(active, age: 86400).enabled, "day-old settings require reconfirmation")
    try require(!show(active, account: "paused").enabled, "known pause overrides cached enabled setting")
    try require(!show(active, account: "restoring").enabled, "known disconnection overrides cached enabled setting")
    try require(!show(status(live: false)).enabled, "disabled live screening must not show enabled")
    try require(!show(status(alwaysOn: false, expiry: now.addingTimeInterval(-1))).enabled, "window expiry is evaluated locally")
    try require(!show(status(alwaysOn: false, expiry: now.addingTimeInterval(60), remaining: 0)).enabled, "exhausted window is not on")
    try require(show(status(alwaysOn: false, expiry: now.addingTimeInterval(60))).enabled, "unexpired window stays enabled")
    for outcome in [CallOutcome.held, .verification, .connected, .voicemail] {
        let id = UUID()
        let call = CallRecord(id: id, occurredAt: now, callerNumber: "Synthetic", title: "Synthetic", outcome: outcome,
                              reasonCode: "", detail: "", nextStep: "", acceptedAt: nil, endedAt: now,
                              voicemail: .init(id: id, duration: 1, status: outcome == .voicemail ? "ready" : "removed", heardAt: nil))
        try require(CallFilter.voicemail.includes(call) == (outcome == .voicemail), "local Messages filtering must match the server outcome query")
    }
    print("Home status retention, connection failures, expiry, pause/disconnection and local/server call-filter parity passed.")
}

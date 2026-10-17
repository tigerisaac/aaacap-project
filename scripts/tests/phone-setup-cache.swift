import Foundation

func testPhoneSetupCache(root: URL) throws {
    let cache = PhoneSetupCache(root: root.appending(path: "setup"))
    let participant = UUID(), other = UUID(), now = Date.now
    let data = Data(#"{"instructions":["Synthetic saved carrier steps"]}"#.utf8)
    try cache.save(data, path: "/api/setup", participant: participant, account: "one", now: now)
    let relaunched = PhoneSetupCache(root: root.appending(path: "setup"))
    try require(relaunched.read("/api/setup", participant: participant, account: "one")?.data == data, "setup survives relaunch")
    try require(relaunched.read("/api/setup", participant: other, account: "one") == nil, "setup isolates participants")
    try require(relaunched.read("/api/setup", participant: participant, account: "two") == nil, "setup isolates accounts")
    try cache.save(data, path: "/api/forwarding/restoration", participant: participant, account: "one")
    try require(cache.read("/api/forwarding/restoration", participant: participant, account: "one") == nil, "disconnect confirmation must not be cached")
    try cache.invalidate(account: "one")
    let stale = cache.read("/api/setup", participant: participant, account: "one")
    try require(stale?.data == data && stale?.invalidated == true && stale?.savedAt == now, "refresh preserves readable instructions but expires status")
    let forwarding = Data(#"{"restorationRequested":true,"stage":"restore","alwaysOn":true}"#.utf8)
    try cache.save(forwarding, path: "/api/forwarding", participant: participant, account: "one", now: now)
    try cache.applyCancellation(.init(session: UUID(), cancelled: true, setupReviewRequired: true, stage: "overview"), participant: participant, account: "one")
    let cancelled = cache.read("/api/forwarding", participant: participant, account: "one")!
    let object = try JSONSerialization.jsonObject(with: cancelled.data) as! [String: Any]
    try require(object["restorationRequested"] as? Bool == false && object["setupReviewRequired"] as? Bool == true, "acknowledged cancellation replaces saved intent")
    try require(object["alwaysOn"] as? Bool == true && cancelled.savedAt == now && cancelled.invalidated, "cancellation preserves other configuration and original age without claiming freshness")
    try require(relaunched.read("/api/forwarding", participant: participant, account: "one")?.data == cancelled.data, "cancellation survives relaunch")
    try require(cache.read("/api/forwarding", participant: participant, account: "two") == nil, "cancellation stays account-scoped")
    try cache.retain(participants: [other], account: "one")
    try require(cache.read("/api/setup", participant: participant, account: "one") == nil, "removed owner snapshots must be removed")
    try cache.save(data, path: "/api/setup", participant: participant, account: "one")
    try cache.remove(account: "one")
    try require(cache.read("/api/setup", participant: participant, account: "one") == nil, "account deletion removes setup")
    let local = RestorationStatus.localGuide(instructions: ["Saved carrier instructions"], carrier: "Example carrier")
    try require(local.id == nil && !local.completed && local.required, "local guide cannot claim server completion")
    try require(local.steps.allSatisfy { $0.code == nil }, "local guide must never invent carrier codes")
    try require(local.instructions == ["Saved carrier instructions"], "saved carrier instructions remain verbatim")
    print("Phone setup cache tests passed")
}

#if DEBUG && targetEnvironment(simulator)
import Foundation

/// Synthetic service paired with actual simulator Contacts and production recovery storage.
actor ContactRecoveryFixture {
    static let person = UUID(uuidString: "00000000-0000-4000-8000-000000000081")!
    static let row = UUID(uuidString: "00000000-0000-4000-8000-000000000082")!
    static let phone = "+12025550186"
    private static let savedKey = "synthetic-contact-recovery-enabled"
    private var enabled: Bool
    private var revision: Int
    private var connected = true
    private var failFirst = true
    private var patches = 0
    private var shares = 0

    init() {
        let resume = ProcessInfo.processInfo.arguments.contains("--contact-recovery-resume")
        let missing = ProcessInfo.processInfo.arguments.contains("--contact-recovery-missing-restoration")
        enabled = missing ? false : resume ? UserDefaults.standard.bool(forKey: Self.savedKey) : true
        revision = missing ? 2 : enabled ? 0 : 1
        failFirst = !resume && !missing
        if !resume { UserDefaults.standard.set(enabled, forKey: Self.savedKey) }
    }
    func restoreConnection() { connected = true; failFirst = false }
    func status() async -> String {
        let local = try? await PhoneContacts.shared.containsIfAuthorized(Self.phone)
        return "phone:\(local == true);server:\(enabled);patches:\(patches);shares:\(shares)"
    }
    func response(path: String, method: String, body: Data?) throws -> Data {
        guard path.hasPrefix("/api/trusted-numbers") else { throw APIError.unconfigured }
        if method == "PATCH" {
            patches += 1
            if failFirst, ProcessInfo.processInfo.arguments.contains("--contact-recovery-before-save") {
                failFirst = false; throw URLError(.networkConnectionLost)
            }
            let payload = try JSONSerialization.jsonObject(with: body ?? Data()) as? [String: Any]
            guard let target = payload?["enabled"] as? Bool, let id = payload?["changeId"] as? String,
                  payload?["expectedRevision"] as? Int == revision else { throw APIError.service(code: "contacts_changed", status: 409) }
            enabled = target; revision += 1; UserDefaults.standard.set(target, forKey: Self.savedKey)
            if failFirst { failFirst = false; connected = false; throw URLError(.networkConnectionLost) }
            return try JSONSerialization.data(withJSONObject: ["saved": true, "changeId": id, "revision": revision])
        }
        if method == "POST" { shares += 1; throw APIError.invalidResponse }
        guard method == "GET", connected else { throw URLError(.notConnectedToInternet) }
        if ProcessInfo.processInfo.arguments.contains("--contact-recovery-missing-restoration") {
            return try JSONSerialization.data(withJSONObject: ["changeContract": "revision-v1", "revision": revision,
                "sharedAt": NSNull(), "items": []])
        }
        return try JSONSerialization.data(withJSONObject: ["changeContract": "revision-v1", "revision": revision,
            "sharedAt": NSNull(), "items": [["id": Self.row.uuidString, "label": "Synthetic contact recovery", "phone": Self.phone,
                "createdAt": "2026-10-18T12:00:00.000Z", "enabled": enabled]]])
    }
}
#endif

#if DEBUG && targetEnvironment(simulator)
import Foundation

/// Synthetic settings storage: the first save can succeed even though its response is lost.
actor OnboardingRecoveryFixture {
    private var reads = 0
    private var attempts = 0
    private var changes = 0
    private var recorded = false
    private var enabled = false
    private var contact: [String: Any]?
    private var pendingSave: CheckedContinuation<Void, Never>?
    private var pendingRefresh: CheckedContinuation<Void, Never>?

    func response(path: String, method: String, body: Data?, participantID: UUID?) async throws -> Data? {
        guard ["/api/forwarding", "/api/forwarding/monitoring", "/api/trusted-contacts/choice", "/api/trusted-contacts"].contains(path) else { return nil }
        let arguments = ProcessInfo.processInfo.arguments
        if method == "POST" {
            let payload = try JSONSerialization.jsonObject(with: body ?? Data()) as? [String: Any]
            if path == "/api/trusted-contacts" {
                guard let id = payload?["id"] as? String, let name = payload?["name"] as? String,
                      let phone = payload?["phone"] as? String else { throw APIError.invalidResponse }
                let saved: [String: Any] = ["id": id, "name": name, "phone": phone, "status": "pending",
                    "textAlerts": false, "appAlerts": false, "requestDelivery": "submitted"]
                contact = saved; enabled = true; recorded = true
                return try JSONSerialization.data(withJSONObject: ["contact": saved])
            }
            guard let value = payload?["enabled"] as? Bool else { throw APIError.invalidResponse }
            attempts += 1
            if attempts == 1, arguments.contains("--onboarding-save-rejected") {
                throw APIError.service(code: "monitoring_unavailable", status: 409)
            }
            if attempts == 1, arguments.contains("--onboarding-not-saved") { throw URLError(.networkConnectionLost) }
            enabled = value; recorded = true; changes += 1
            if attempts == 1, arguments.contains("--onboarding-session-race") {
                await withCheckedContinuation { pendingSave = $0 }
            }
            if attempts == 1 { throw URLError(.networkConnectionLost) }
            return Data("{}".utf8)
        }
        guard method == "GET" else { throw APIError.invalidResponse }
        reads += 1
        if reads == 1, arguments.contains("--onboarding-read-fails") { throw URLError(.networkConnectionLost) }
        if path == "/api/forwarding" {
            guard let participantID else { throw APIError.invalidResponse }
            let snapshot = try JSONSerialization.data(withJSONObject: [
                "participantId": participantID.uuidString, "carrier": "Synthetic carrier", "phone": "+12025550101", "shieldNumber": "+12025550102",
                "prepared": true, "active": false, "remainingCalls": 10, "consentVersion": "ui-test", "consented": true,
                "phoneVerified": true, "stage": "checks", "restorationRequested": false, "activationCodes": [],
                "restorationSteps": [], "readiness": "Ready", "latestEvents": [],
                "monitoring": ["available": true, "enabled": enabled, "choiceRecorded": recorded, "consentVersion": "ui-test"]
            ])
            await withCheckedContinuation { pendingRefresh = $0 }
            return snapshot
        }
        let result: [String: Any] = path == "/api/forwarding/monitoring"
            ? ["available": true, "enabled": enabled, "choiceRecorded": recorded, "consentVersion": "ui-test"]
            : ["available": true, "enabled": enabled, "choiceRecorded": recorded, "contacts": contact.map { [$0] } ?? []]
        return try JSONSerialization.data(withJSONObject: result)
    }

    func status() -> String {
        let state = "reads:\(reads);attempts:\(attempts);changes:\(changes);recorded:\(recorded);enabled:\(enabled)"
        if ProcessInfo.processInfo.arguments.contains("--onboarding-session-race") {
            return state + ";heldSave:\(pendingSave != nil);heldRefresh:\(pendingRefresh != nil)"
        }
        return state
    }

    func releaseSave() { pendingSave?.resume(); pendingSave = nil }
    func releaseRefresh() { pendingRefresh?.resume(); pendingRefresh = nil }
}
#endif

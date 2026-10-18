#if DEBUG && targetEnvironment(simulator)
import Foundation

/// Holds the second read until the test explicitly releases it. No network, phone or account is used.
actor CaretakerRefreshFixture {
    private var reads = 0
    private var changes = 0
    private var enabled = true
    private var hasContact = true
    private var released = false
    private var pending: CheckedContinuation<Void, Never>?

    func response(path: String, method: String, body: Data?) async throws -> Data? {
        guard path.hasPrefix("/api/trusted-contacts") || path.hasPrefix("/api/contact-alerts") else { return nil }
        if method == "POST", path == "/api/trusted-contacts/choice" {
            let payload = try JSONSerialization.jsonObject(with: body ?? Data()) as? [String: Bool]
            guard let value = payload?["enabled"] else { throw APIError.invalidResponse }
            enabled = value
            changes += 1
            return Data("{}".utf8)
        }
        if method == "DELETE" || (method == "POST" && path.hasPrefix("/api/contact-alerts/")) {
            hasContact = false
            changes += 1
            return Data("{}".utf8)
        }
        guard method == "GET" else { throw APIError.invalidResponse }
        reads += 1
        let read = reads
        let recipient = path == "/api/contact-alerts"
        let contact: [String: Any] = ["id": "00000000-0000-4000-8000-000000000001", "name": "Jamie",
            "phone": "+12025550101", "status": recipient ? "pending" : "accepted",
            "textAlerts": !recipient, "appAlerts": false, "requestDelivery": "submitted", "ownerPaused": false]
        let contacts = hasContact ? [contact] : []
        let result: [String: Any] = recipient
            ? ["requests": contacts, "textAvailable": true, "appAvailable": true, "textsStopped": false]
            : ["available": true, "choiceRecorded": true, "enabled": enabled, "contacts": contacts]
        let snapshot = try JSONSerialization.data(withJSONObject: result)
        if read == 2 {
            await withCheckedContinuation { pending = $0 }
            if ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-old-fails") { throw URLError(.networkConnectionLost) }
        }
        if read == 3, ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-fresh-fails") { throw URLError(.networkConnectionLost) }
        return snapshot
    }

    func release() {
        released = true
        pending?.resume()
        pending = nil
    }

    func status() -> String {
        "reads:\(reads);changes:\(changes);held:\(pending != nil);released:\(released);enabled:\(enabled);contacts:\(hasContact ? 1 : 0)"
    }
}
#endif

#if DEBUG && targetEnvironment(simulator)
import Foundation

/// Holds the second read until the test explicitly releases it. No network, phone or account is used.
actor CaretakerRefreshFixture {
    private var reads = 0
    private var changes = 0
    private var enabled = !ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-create")
    private var hasContact = !ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-create")
    private var contactID = "00000000-0000-4000-8000-000000000001"
    private var contactName = "Jamie"
    private var contactPhone = "+12025550101"
    private var creationAttempts = 0
    private var creationIDs: Set<String> = []
    private var recipientAccepted = ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-recipient-accepted")
    private var recipientTexts = ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-recipient-accepted")
    private var recipientAppAlerts = false
    private var released = false
    private var pending: CheckedContinuation<Void, Never>?

    func response(path: String, method: String, body: Data?) async throws -> Data? {
        guard path.hasPrefix("/api/trusted-contacts") || path.hasPrefix("/api/contact-alerts") else { return nil }
        if method == "POST", path == "/api/trusted-contacts" {
            let payload = try JSONSerialization.jsonObject(with: body ?? Data()) as? [String: Any]
            guard let id = payload?["id"] as? String, let name = payload?["name"] as? String,
                  let phone = payload?["phone"] as? String else { throw APIError.invalidResponse }
            creationAttempts += 1; creationIDs.insert(id)
            if creationAttempts == 1 {
                if ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-create-not-saved") {
                    throw URLError(.networkConnectionLost)
                }
                if ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-create-rejected") {
                    throw APIError.service(code: "trusted_contact_self", status: 400)
                }
            }
            if !hasContact {
                contactID = id; contactName = name; contactPhone = phone
                hasContact = true; enabled = true; changes += 1
                if ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-change-response-lost") {
                    throw URLError(.networkConnectionLost)
                }
            }
            guard id == contactID, phone == contactPhone else { throw APIError.invalidResponse }
            return try JSONSerialization.data(withJSONObject: ["contact": ["id": contactID, "name": contactName,
                "phone": contactPhone, "status": "pending", "textAlerts": false, "appAlerts": false,
                "requestDelivery": "submitted"]])
        }
        if method == "POST", path == "/api/trusted-contacts/choice" {
            let payload = try JSONSerialization.jsonObject(with: body ?? Data()) as? [String: Bool]
            guard let value = payload?["enabled"] else { throw APIError.invalidResponse }
            enabled = value
            changes += 1
            return Data("{}".utf8)
        }
        if method == "DELETE" {
            hasContact = false
            changes += 1
            return Data("{}".utf8)
        }
        if method == "POST", path.hasPrefix("/api/contact-alerts/") {
            let payload = try JSONSerialization.jsonObject(with: body ?? Data()) as? [String: Bool]
            guard let accept = payload?["accept"] else { throw APIError.invalidResponse }
            hasContact = accept
            recipientAccepted = accept
            recipientTexts = accept && payload?["textAlerts"] == true
            recipientAppAlerts = accept && payload?["appAlerts"] == true
            changes += 1
            // The server applied the change, but the client did not receive its response.
            if ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-change-response-lost") {
                throw URLError(.networkConnectionLost)
            }
            return Data("{}".utf8)
        }
        guard method == "GET" else { throw APIError.invalidResponse }
        reads += 1
        let read = reads
        let recipient = path == "/api/contact-alerts"
        let pendingCreation = ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-create")
        let contact: [String: Any] = ["id": contactID, "name": contactName,
            "phone": contactPhone, "status": pendingCreation || (recipient && !recipientAccepted) ? "pending" : "accepted",
            "textAlerts": recipient ? recipientTexts : true, "appAlerts": recipient && recipientAppAlerts,
            "requestDelivery": "submitted", "ownerPaused": false]
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
        let state = "reads:\(reads);changes:\(changes);held:\(pending != nil);released:\(released);enabled:\(enabled);contacts:\(hasContact ? 1 : 0)"
        if ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-create") {
            return state + ";creationAttempts:\(creationAttempts);creationIdentities:\(creationIDs.count)"
        }
        return state
    }
}
#endif

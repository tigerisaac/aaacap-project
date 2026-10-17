import Foundation

extension APIClient: MessageDeliveryAPI {
    func downloadMessage(_ id: UUID, participantID: UUID) async throws -> MessageDelivery {
        try await send("/api/voicemails/\(id)/delivery", participantID: participantID)
    }
    func confirmMessage(_ id: UUID, participantID: UUID, delivery: MessageDelivery) async throws {
        let _: APIResponses.Empty = try await send("/api/voicemails/\(id)/delivered", method: "POST",
            body: Self.payload(["receipt": delivery.receipt, "sha256": MessageAudioStore.digest(delivery.audio)]), participantID: participantID)
    }
}

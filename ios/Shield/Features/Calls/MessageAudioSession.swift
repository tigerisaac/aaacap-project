import AVFoundation
import Foundation

/// Serialize route changes, including asynchronous transitions, and ignore stale cleanup.
actor MessageAudioSession {
    static let shared = MessageAudioSession()
    private var activeToken: UUID?
    private var pendingOperation: Task<Void, Error>?
    private var operationID: UUID?

    func activate(_ token: UUID, videoGuide: Bool = false) async throws {
        activeToken = token
        try await perform {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: videoGuide ? .moviePlayback : .spokenAudio,
                                    options: videoGuide ? [.mixWithOthers] : [])
            if #available(iOS 27.0, *) {
                guard try await session.activate(options: []) else { throw APIError.invalidResponse }
            } else {
                try session.setActive(true)
            }
        }
    }

    func deactivate(_ token: UUID) async {
        guard token == activeToken else { return }
        activeToken = nil
        try? await perform {
            let session = AVAudioSession.sharedInstance()
            if #available(iOS 27.0, *) {
                _ = try await session.deactivate(options: [.notifyOthersOnDeactivation])
            } else {
                try session.setActive(false, options: .notifyOthersOnDeactivation)
            }
        }
    }

    private func perform(_ action: @escaping @Sendable () async throws -> Void) async throws {
        let previous = pendingOperation
        let id = UUID()
        let operation = Task {
            if let previous { _ = try? await previous.value }
            try await action()
        }
        pendingOperation = operation
        operationID = id
        defer {
            if operationID == id { pendingOperation = nil; operationID = nil }
        }
        try await operation.value
    }
}

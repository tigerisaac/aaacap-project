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

    /// The freshly prepared player crosses to its UI owner only once. Preparation
    /// stays in the session queue so a concurrent stop cannot deactivate too early.
    func preparePlayer(_ token: UUID, data: Data) async throws -> sending AVAudioPlayer {
        activeToken = token
        return try await withCheckedThrowingContinuation { continuation in
            // Enqueue before suspending: a stop requested during preparation must
            // run after it, including its implicit audio-session activation.
            _ = enqueue {
                do {
                    let session = AVAudioSession.sharedInstance()
                    try session.setCategory(.playback, mode: .spokenAudio)
                    if #available(iOS 27.0, *) {
                        guard try await session.activate(options: []) else { throw APIError.invalidResponse }
                    } else {
                        try session.setActive(true)
                    }
                    #if DEBUG && targetEnvironment(simulator)
                    if ProcessInfo.processInfo.arguments.contains("--uitesting-delayed-audio-preparation") {
                        try await Task.sleep(for: .seconds(4))
                    }
                    #endif
                    let player = try AVAudioPlayer(data: data)
                    guard player.prepareToPlay() else { throw APIError.invalidResponse }
                    continuation.resume(returning: player)
                } catch {
                    continuation.resume(throwing: error)
                }
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
        try await enqueue(action).value
    }

    private func enqueue(_ action: @escaping @Sendable () async throws -> Void) -> Task<Void, Error> {
        let previous = pendingOperation
        let id = UUID()
        let operation = Task {
            defer {
                if operationID == id { pendingOperation = nil; operationID = nil }
            }
            if let previous { _ = try? await previous.value }
            try await action()
        }
        pendingOperation = operation
        operationID = id
        return operation
    }
}

#if DEBUG && targetEnvironment(simulator)
import SwiftUI

/// Isolated file and injected reloader: no CallKit, authentication, network or telephone operation.
struct CallDirectoryStorageCheckView: View {
    @MainActor private final class Reloader {
        var failing = false
        var paused = false
        var waiting: CheckedContinuation<Void, Never>?
        func reload() async throws -> Bool {
            if paused { await withCheckedContinuation { waiting = $0 } }
            if failing { throw CocoaError(.coderReadCorrupt) }
            return true
        }
        func release() { paused = false; waiting?.resume(); waiting = nil }
    }
    @State private var directory: CallDirectoryCoordinator?
    @State private var result = "Checking blocking storage…"

    var body: some View {
        NavigationStack {
            List {
                Text(result).accessibilityIdentifier("blocking-storage-result")
                if let directory {
                    Text(directory.needsReload ? "Blocking clear pending" : "Blocking clear applied")
                    CallDirectoryStatusView(directory: directory, phoneBlocking: true)
                }
            }
            .shieldListStyle()
            .navigationTitle("Blocking check")
        }
        .task {
            do {
                let root = URL.applicationSupportDirectory.appending(path: "SyntheticCallDirectoryCheck")
                try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
                let file = root.appending(path: CallDirectoryList.fileName)
                let reloader = Reloader()
                let coordinator = CallDirectoryCoordinator(fileURL: file) { try await reloader.reload() }
                if ProcessInfo.processInfo.arguments.contains("--seed-call-directory") {
                    await coordinator.activate("synthetic-directory-owner")
                    await coordinator.update(entries: [.init(number: 100_000_001, expiresAt: .now.addingTimeInterval(60))],
                                             account: "synthetic-directory-owner", participantID: UUID())
                    reloader.failing = true
                    reloader.paused = true
                    let model = AppState(configuration: BackendConfiguration(baseURL: nil), callDirectory: coordinator)
                    model.isPreview = false
                    model.signedIn = true
                    await model.signOut()
                    for _ in 0..<1000 where reloader.waiting == nil { await Task.yield() }
                    guard !model.signedIn, reloader.waiting != nil else { throw CocoaError(.coderReadCorrupt) }
                    reloader.release()
                    for _ in 0..<1000 where !model.showingError { await Task.yield() }
                    guard model.showingError, model.errorMessage != nil else { throw CocoaError(.coderReadCorrupt) }
                    reloader.failing = false
                } else {
                    await coordinator.activate(nil)
                }
                guard let saved = CallDirectoryList.load(from: file), saved.entries.isEmpty, saved.accountKey == nil,
                      try file.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else {
                    throw CocoaError(.coderReadCorrupt)
                }
                let attributes = try FileManager.default.attributesOfItem(atPath: file.path)
                if let protection = attributes[.protectionKey] as? String,
                   protection != FileProtectionType.completeUntilFirstUserAuthentication.rawValue { throw CocoaError(.coderReadCorrupt) }
                directory = coordinator
                result = "Blocking storage passed"
            } catch {
                result = "Blocking storage check failed"
            }
        }
    }
}
#endif

#if DEBUG && targetEnvironment(simulator)
import SwiftUI

struct MessageAudioStorageCheckView: View {
    @State private var result = "Checking message storage…"
    @State private var player = VoicePlayer()
    var body: some View {
        Text(result).accessibilityIdentifier("audio-storage-result").task {
            do {
                let root = URL.applicationSupportDirectory.appending(path: "SyntheticAudioStorageCheck")
                let account = "synthetic-owner"
                let id = UUID(uuidString: "6ee22326-78f5-47c9-bf96-83e9c0fc1ab9")!
                let store = MessageAudioStore(root: root)
                await store.activate(account)
                if ProcessInfo.processInfo.arguments.contains("--seed-audio-storage") {
                    let call = CallRecord(id: id, occurredAt: .now, callerNumber: "Synthetic", title: "Synthetic recording", outcome: .voicemail,
                        reasonCode: "uncertain", detail: "", nextStep: "", acceptedAt: nil, endedAt: .now,
                        voicemail: Voicemail(id: id, duration: 2, status: "ready", heardAt: nil))
                    let bytes = PreviewAudio.data
                    try await store.save(SavedMessageAudio(person: DemoData.participant, call: call,
                        delivery: MessageDelivery(audio: bytes, sha256: MessageAudioStore.digest(bytes), receipt: "synthetic"), acknowledged: true), account: account)
                }
                guard let saved = try await store.load(account: account, id: id) else { throw MessageAudioError.invalidFile }
                let url = root.appending(path: MessageAudioStore.digest(Data(account.utf8))).appending(path: id.uuidString.lowercased()+".json")
                let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
                guard try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else { throw MessageAudioError.invalidFile }
                // Simulator filesystems may omit iOS Data Protection metadata. The production
                // writer still requires setAttributes to succeed; hardware protection needs a device check.
                if let protection = attributes[.protectionKey] as? String,
                   protection != FileProtectionType.completeUntilFirstUserAuthentication.rawValue {
                    result = "Unexpected file protection: \(String(describing: attributes[.protectionKey]))"
                    return
                }
                try await player.play(data: saved.delivery.audio)
                result = "Local audio playback passed"
            } catch { result = "Storage check failed: \(error.localizedDescription)" }
        }
    }
}
#endif

import Foundation
import Observation

@MainActor @Observable
final class DisconnectModel {
    var status: RestorationStatus?
    var working = false
    var error: String?
    var fixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") || ProcessInfo.processInfo.arguments.contains("--uitesting-disconnect")
        #else
        false
        #endif
    }
    func load(_ app: AppState, id: UUID) async {
        guard !working else { return }
        working = true
        error = nil
        defer { working = false }
        do {
            if fixture || app.isDemo || app.isPreview {
                #if DEBUG
                if status == nil {
                    let args = ProcessInfo.processInfo.arguments
                    var sample = Self.sample
                    if args.contains("--restoration-resume"), let data = UserDefaults.standard.data(forKey: "shield-disconnect-fixture") {
                        sample = (try? JSONDecoder().decode(RestorationStatus.self, from: data)) ?? sample
                    } else if args.contains("--restoration-start-settings") { sample.id = UUID(); sample.index = 3 }
                    else if args.contains("--restoration-start-checks") { sample.id = UUID(); sample.index = 5 }
                    if args.contains("--restoration-manual") { sample.steps = [.init(id: "carrier", kind: "carrier")] + Array(sample.steps.suffix(4)) }
                    status = sample
                }
                #endif
                return
            }
            status = try await app.api.send("/api/forwarding/restoration", participantID: id)
        } catch { self.error = error.localizedDescription }
    }
    func advance(_ app: AppState, id: UUID, restart: Bool = false) async {
        guard !working, let status else { return }
        working = true
        error = nil
        defer { working = false }
        do {
            if fixture {
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--restoration-save-fails") {
                    throw APIError.service(code: "request_failed", status: 503)
                }
                var next = status
                if restart || next.id == nil { next.id = UUID(); next.index = 0; next.completed = false }
                else { next.index += 1; next.completed = next.index == next.steps.count; next.required = !next.completed }
                self.status = next
                UserDefaults.standard.set(try JSONEncoder().encode(next), forKey: "shield-disconnect-fixture")
                #endif
                return
            }
            guard !app.isDemo, !app.isPreview else { return }
            if restart || status.id == nil {
                self.status = try await app.api.send("/api/forwarding/restore", method: "POST", body: APIClient.payload(["restart": restart]), participantID: id)
            } else if let step = status.current {
                self.status = try await app.api.send("/api/forwarding/restoration/confirm", method: "POST",
                    body: APIClient.payload(["session": status.id!.uuidString, "step": step.id]), participantID: id)
            }
        } catch { self.error = error.localizedDescription }
    }
    #if DEBUG
    static var sample: RestorationStatus {
        .init(index: 0, completed: false,
              steps: ["##61#", "##67#", "##62#"].enumerated().map { .init(id: "carrier-\($0.offset)", kind: "code", code: $0.element) }
                + [.init(id: "settings", kind: "settings"), .init(id: "voicemail-settings", kind: "voicemailSettings"),
                   .init(id: "call", kind: "call"), .init(id: "voicemail", kind: "voicemail")],
              instructions: ["Restore the forwarding settings saved for your mobile line."], carrier: "Tello", required: true)
    }
    #endif
}

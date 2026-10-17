import Foundation
import Observation

@MainActor @Observable
final class DisconnectModel {
    var status: RestorationStatus?
    var cancellation: RestorationStatus.Cancellation?
    var localInstructions: [String] = []
    var working = false
    var error: String?
    var cancellationFailed = false
    var cancelling = false
    var fixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") || ProcessInfo.processInfo.arguments.contains("--uitesting-disconnect")
        #else
        false
        #endif
    }
    func load(_ app: AppState, id: UUID, refresh: Bool = false) async {
        guard !working else { return }
        working = true
        error = nil
        cancellationFailed = false
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
                    if args.contains("--restoration-local-guide") {
                        sample = .localGuide(instructions: ["Synthetic saved carrier instructions"], carrier: "Example carrier")
                    }
                    localInstructions = sample.instructions
                    status = sample
                }
                #endif
                return
            }
            // The bundled guide is available before the first local disk read yields.
            if status == nil { status = .localGuide(instructions: [], carrier: "your carrier") }
            let session = app.sessionGeneration
            let setup: (value: SetupStatus, savedAt: Date, isFresh: Bool)? = await app.api.savedPhoneSetup("/api/setup", participantID: id)
            let forwarding: (value: ForwardingStatus, savedAt: Date, isFresh: Bool)? = await app.api.savedPhoneSetup("/api/forwarding", participantID: id)
            guard app.sessionGeneration == session else { return }
            localInstructions = forwarding?.value.restorationSteps ?? setup?.value.carrierProfile?.restorationSteps ?? []
            if refresh {
                let fresh: RestorationStatus = try await app.api.send("/api/forwarding/restoration", participantID: id)
                guard app.sessionGeneration == session else { return }
                status = fresh
            } else if status?.id == nil {
                status = .localGuide(instructions: localInstructions,
                    carrier: forwarding?.value.carrier ?? setup?.value.carrierProfile?.name ?? "your carrier")
            }
        } catch { self.error = error.localizedDescription }
    }
    func advance(_ app: AppState, id: UUID, restart: Bool = false) async {
        guard !working, let status else { return }
        working = true
        error = nil
        cancellationFailed = false
        defer { working = false }
        do {
            if fixture {
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--restoration-local-guide") {
                    throw APIError.service(code: "request_failed", status: 404)
                }
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
            // Check the new protocol before any mutation: older deployments use different
            // semantics for /restore and must never be used as a fallback.
            let session = app.sessionGeneration
            var fresh = status
            if restart || status.id == nil {
                fresh = try await app.api.send("/api/forwarding/restoration", participantID: id)
            }
            guard app.sessionGeneration == session else { return }
            if !restart, status.id == nil, fresh.id != nil {
                self.status = fresh
                return
            }
            let next: RestorationStatus
            if restart || fresh.id == nil {
                next = try await app.api.send("/api/forwarding/restore", method: "POST", body: APIClient.payload(["restart": restart]), participantID: id)
            } else if fresh.id != status.id || fresh.index != status.index {
                next = fresh
            } else if let step = fresh.current {
                next = try await app.api.send("/api/forwarding/restoration/confirm", method: "POST",
                    body: APIClient.payload(["session": fresh.id!.uuidString, "step": step.id]), participantID: id)
            } else { next = fresh }
            guard app.sessionGeneration == session else { return }
            self.status = next
        } catch {
            if case APIError.service(_, 404) = error {
                self.error = "Guided disconnect is temporarily unavailable. You can still read all the phone steps here. Shield’s service has not been turned off."
            } else { self.error = error.localizedDescription }
        }
    }
    func cancel(_ app: AppState, id: UUID, settingsUnchanged: Bool) async {
        guard !working, let restorationID = status?.id else { return }
        working = true
        cancelling = true
        error = nil
        cancellationFailed = false
        defer { working = false; cancelling = false }
        let generation = app.sessionGeneration
        do {
            let receipt: RestorationStatus.Cancellation
            if fixture {
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--restoration-cancel-fails") {
                    throw APIError.service(code: "request_failed", status: 503)
                }
                receipt = .init(session: restorationID, cancelled: true, setupReviewRequired: !settingsUnchanged, stage: "overview")
                UserDefaults.standard.removeObject(forKey: "shield-disconnect-fixture")
                #else
                return
                #endif
            } else {
                guard !app.isDemo, !app.isPreview else { return }
                receipt = try await app.api.cancelRestoration(participantID: id, session: restorationID, settingsUnchanged: settingsUnchanged)
            }
            guard generation == app.sessionGeneration else { return }
            cancellation = receipt
            app.phoneSetupRevision += 1
        } catch {
            cancellationFailed = true
            self.error = "We couldn’t confirm cancellation. Try again when you’re connected, or refresh progress if you continued on another device."
        }
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

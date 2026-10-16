#if DEBUG
import Foundation
import Observation
import UIKit

@MainActor @Observable
final class SetupShortcutSession {
    enum Outcome { case notRun, finished, cancelled, failed }

    var readyToRun = false
    var outcome = Outcome.notRun
    var error: String?
    private(set) var opening = false
    private var pendingRequest: UUID?

    func run() async {
        guard !opening else { return }
        opening = true
        defer { opening = false }
        let request = UUID()
        pendingRequest = request
        outcome = .notRun
        error = nil
        var components = URLComponents()
        components.scheme = "shortcuts"
        components.host = "x-callback-url"
        components.path = "/run-shortcut"
        components.queryItems = [URLQueryItem(name: "name", value: "Shield Call Silencing")]
        for result in ["success", "cancel", "error"] {
            var callback = URLComponents()
            callback.scheme = "org.isaaczhang.shield.setup"
            callback.host = "call-silencing"
            callback.path = "/" + result
            callback.queryItems = [URLQueryItem(name: "request", value: request.uuidString)]
            components.queryItems?.append(URLQueryItem(name: "x-" + result, value: callback.url?.absoluteString))
        }
        guard let url = components.url, await UIApplication.shared.open(url) else {
            pendingRequest = nil
            error = "Shortcuts couldn’t open. You can still make this change in Phone settings."
            return
        }
    }

    func receive(_ url: URL) {
        guard let pendingRequest,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.scheme == "org.isaaczhang.shield.setup",
              components.host == "call-silencing",
              components.queryItems?.first(where: { $0.name == "request" })?.value == pendingRequest.uuidString else { return }
        switch components.path {
        case "/success": outcome = .finished
        case "/cancel": outcome = .cancelled
        case "/error": outcome = .failed
        default: return
        }
        self.pendingRequest = nil
        // Ignore output/error text from the other app. Never treat a callback as verified Settings readback.
    }
}
#endif

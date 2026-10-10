import Foundation

struct BackendConfiguration: Sendable {
    let baseURL: URL?

    static var bundled: BackendConfiguration {
        let scheme = Bundle.main.object(forInfoDictionaryKey: "ShieldAPIScheme") as? String ?? "https"
        let host = Bundle.main.object(forInfoDictionaryKey: "ShieldAPIHost") as? String ?? ""
        let isPlaceholder = host.isEmpty || host.contains(".example") || host.contains("$(")
        var baseURL = isPlaceholder ? nil : URL(string: "\(scheme)://\(host)")
        #if DEBUG
        let local = ["127.0.0.1", "localhost", "::1"].contains(baseURL?.host ?? "")
        if scheme != "https" && !local { baseURL = nil }
        #else
        if scheme != "https" { baseURL = nil }
        #endif
        return BackendConfiguration(baseURL: baseURL)
    }
}

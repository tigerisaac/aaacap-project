import Foundation

enum EmailSignInLink {
    static func code(from url: URL, allowedHost: String) -> String? {
        var candidate = url
        for _ in 0..<3 {
            guard candidate.absoluteString.count <= 8192,
                  let parts = URLComponents(url: candidate, resolvingAgainstBaseURL: false),
                  parts.scheme == "https", parts.host == allowedHost,
                  parts.user == nil, parts.password == nil, parts.port == nil,
                  ["/__/auth/action", "/__/auth/links"].contains(parts.path),
                  let items = parts.queryItems else { return nil }
            var values: [String: String] = [:]
            for item in items {
                guard values[item.name] == nil, let value = item.value else { return nil }
                values[item.name] = value
            }
            if values["mode"] == "signIn", let code = values["oobCode"],
               (16...2048).contains(code.count),
               code.utf8.allSatisfy({ (65...90).contains($0) || (97...122).contains($0)
                   || (48...57).contains($0) || $0 == 45 || $0 == 95 }) {
                return code
            }
            guard let nested = values["link"], let next = URL(string: nested) else { return nil }
            candidate = next
        }
        return nil
    }
}

import Foundation

enum ShieldInvitation {
    static func shareText(code: String, isSample: Bool) -> String {
        isSample
            ? "Sample invitation only. It gives no real access.\n\n\(code)"
            : "I’d like to share my Shield call history with you. In Shield, open More → Family & friends → Use an invitation and paste:\n\n\(code)"
    }

    static func pastedCode(_ text: String) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        // The service issues 24 random bytes as a 32-character base64url token.
        // Email signatures can follow the code. Only extract one unambiguous token.
        guard let pattern = try? NSRegularExpression(pattern: "(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{32}(?![A-Za-z0-9_-])") else { return trimmed }
        let matches = pattern.matches(in: trimmed, range: NSRange(trimmed.startIndex..., in: trimmed))
        let codes = Set(matches.compactMap { match in
            Range(match.range, in: trimmed).map { String(trimmed[$0]) }
        })
        guard codes.count == 1, let code = codes.first else { return trimmed }
        return code
    }
}

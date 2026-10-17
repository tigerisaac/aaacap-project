import Foundation

struct SharedContact: Codable, Sendable {
    let label: String
    let phone: String

    /// Match the API's string bounds without allowing one saved entry to reject
    /// the whole upload. Number validity still belongs to the server parser.
    static func forSharing(label: String, phone: String) -> Self? {
        let whitespace = CharacterSet.whitespacesAndNewlines.union(CharacterSet(charactersIn: "\u{FEFF}"))
        let phone = phone.trimmingCharacters(in: whitespace)
        guard (3...100).contains(phone.unicodeScalars.count) else { return nil }
        let name = label.trimmingCharacters(in: whitespace)
        // The API counts Unicode scalars; Swift's prefix counts graphemes. Keep
        // complete graphemes while respecting the API limit for combined names.
        var label = "", scalarCount = 0
        for character in name.isEmpty ? phone : name {
            let count = character.unicodeScalars.count
            guard scalarCount + count <= 60 else { break }
            label.append(character)
            scalarCount += count
        }
        return Self(label: label.isEmpty ? "Contact" : label, phone: phone)
    }
}

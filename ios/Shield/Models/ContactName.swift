import Foundation

enum ContactName {
    static let maximumLength = 60

    static func cleaned(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines.union(CharacterSet(charactersIn: "\u{FEFF}")))
    }

    static func problem(_ value: String, disallowControls: Bool = false) -> String? {
        let name = cleaned(value)
        if name.isEmpty { return "Enter a name." }
        // Match the API's Unicode-scalar bound, including combined characters.
        if name.unicodeScalars.count > maximumLength { return "Use a shorter name." }
        if disallowControls, name.unicodeScalars.contains(where: { $0.properties.generalCategory == .control }) {
            return "Remove line breaks or hidden characters from the name."
        }
        return nil
    }
}

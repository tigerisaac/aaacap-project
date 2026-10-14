import SwiftUI

enum PhoneDisplay {
    /// Formats North American numbers the way Phone shows them: (512) 555-0123.
    /// Anything else (international, withheld, already formatted) is returned unchanged.
    static func format(_ number: String) -> String {
        let digits = number.filter(\.isNumber)
        let national: Substring
        if digits.count == 11, digits.hasPrefix("1") { national = digits.dropFirst() }
        else if digits.count == 10, !number.hasPrefix("+") { national = Substring(digits) }
        else { return number }
        let area = national.prefix(3), exchange = national.dropFirst(3).prefix(3), line = national.suffix(4)
        return "(\(area)) \(exchange)-\(line)"
    }

    /// For numbers inside running text: a no-break space keeps "(512) 555-0123" on one line.
    static func unbroken(_ formatted: String) -> String {
        formatted.replacingOccurrences(of: " ", with: "\u{00A0}")
    }
}

/// Joins short metadata into one line that wraps as a sentence: "Voicemail · New · Today".
/// The no-break space keeps each separator with the word before it.
enum MetadataLine {
    static func joined(_ parts: [Text?]) -> Text {
        parts.compactMap { $0 }.reduce(nil as Text?) { line, part in
            guard let line else { return part }
            return Text("\(line)\u{00A0}· \(part)")
        } ?? Text(verbatim: "")
    }
}

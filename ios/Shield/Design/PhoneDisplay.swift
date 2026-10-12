import Foundation

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
}

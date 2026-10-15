import Foundation

enum MobileNumber {
    /// Presentation validation only. The server applies country and service-number restrictions.
    static func normalized(_ value: String) -> String? {
        guard value.allSatisfy({ ("0"..."9").contains($0) || "+ ()-.".contains($0) }) else { return nil }
        let digits = value.filter { ("0"..."9").contains($0) }
        if digits.count == 10, let first = digits.first, ("2"..."9").contains(String(first)) { return "+1" + digits }
        if digits.count == 11, digits.first == "1" { return "+" + digits }
        return nil
    }
}

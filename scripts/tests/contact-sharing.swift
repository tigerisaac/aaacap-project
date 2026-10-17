import Foundation

private struct ContactTestFailure: Error { let message: String }
private func require(_ value: Bool, _ message: String) throws {
    if !value { throw ContactTestFailure(message: message) }
}

@main private struct ContactSharingTests {
    static func main() throws {
        let phone = "+12025550181"
        let ordinary = SharedContact.forSharing(label: "  Synthetic contact \n", phone: "  \(phone)\n")
        try require(ordinary?.label == "Synthetic contact" && ordinary?.phone == phone, "outer whitespace was not removed")
        try require(SharedContact.forSharing(label: "\u{FEFF} \n", phone: phone)?.label == phone, "an empty name rejected a valid number")

        for invalid in ["", "  ", "1", "12", String(repeating: "9", count: 101)] {
            try require(SharedContact.forSharing(label: "Synthetic", phone: invalid) == nil, "invalid structural bounds reached the request")
        }
        let formatted = "(202) 555-0182 ext. 23"
        try require(SharedContact.forSharing(label: "Synthetic", phone: formatted)?.phone == formatted, "number formatting or extension was altered")
        let international = "+44 20 7946 0182"
        try require(SharedContact.forSharing(label: "Synthetic", phone: international)?.phone == international, "international number was rewritten")
        try require(SharedContact.forSharing(label: "Synthetic", phone: "123")?.phone == "123", "number validity was guessed on the client")

        let family = "👨‍👩‍👧‍👦", combined = "e\u{0301}"
        let cases = [(String(repeating: "A", count: 61), String(repeating: "A", count: 60)),
                     (String(repeating: "😀", count: 60), String(repeating: "😀", count: 60)),
                     (String(repeating: family, count: 60), String(repeating: family, count: 8)),
                     (String(repeating: combined, count: 60), String(repeating: combined, count: 30)),
                     ("A" + String(repeating: "\u{0301}", count: 61), "Contact")]
        var labels: [SharedContact] = []
        for (raw, expected) in cases {
            guard let contact = SharedContact.forSharing(label: raw, phone: phone) else { throw ContactTestFailure(message: "valid number was lost") }
            try require(contact.label == expected && contact.label.unicodeScalars.count <= 60, "name exceeded API limits or split a grapheme")
            labels.append(contact)
        }
        let raw = [SharedContact(label: "   ", phone: phone),
                   SharedContact(label: String(repeating: family, count: 60), phone: "(202) 555-0182"),
                   SharedContact(label: "Short saved value", phone: "12"),
                   SharedContact(label: "Blank saved value", phone: " \n"),
                   SharedContact(label: "Long saved value", phone: String(repeating: "9", count: 101)),
                   SharedContact(label: "Server validates numbers", phone: "123")]
        let contacts = raw.compactMap { SharedContact.forSharing(label: $0.label, phone: $0.phone) }
        try require(raw.count - contacts.count == 3, "local skipped count was lost")
        // Pass the actual Swift payload to the backend schema in the JS runner.
        struct Result: Encodable { let contacts: [SharedContact]; let locallySkipped: Int; let labelCases: [SharedContact] }
        let data = try JSONEncoder().encode(Result(contacts: contacts, locallySkipped: raw.count - contacts.count, labelCases: labels))
        print(String(decoding: data, as: UTF8.self))
    }
}

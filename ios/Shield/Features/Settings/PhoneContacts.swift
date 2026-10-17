import Contacts
import Foundation

/// Phone Contacts is the routing authority for this conditional-forwarding demo.
/// Only names/numbers cross the API boundary; removed phone fields stay locally restorable.
actor PhoneContacts {
    static let shared = PhoneContacts()
    private let store = CNContactStore()
    private let keys: [CNKeyDescriptor] = [CNContactIdentifierKey, CNContactGivenNameKey, CNContactFamilyNameKey,
        CNContactOrganizationNameKey, CNContactPhoneNumbersKey].map { $0 as CNKeyDescriptor }

    private func authorize() async throws {
        if CNContactStore.authorizationStatus(for: .contacts) == .notDetermined {
            _ = try await store.requestAccess(for: .contacts)
        }
        guard CNContactStore.authorizationStatus(for: .contacts) == .authorized else {
            throw APIError.service(code: "full_contacts_required", status: 403)
        }
    }

    static func canonical(_ value: String) -> String {
        let digits = value.filter(\.isNumber)
        if value.trimmingCharacters(in: .whitespaces).hasPrefix("+") { return "+" + digits }
        if digits.count == 10 { return "+1" + digits }
        if digits.count == 11, digits.hasPrefix("1") { return "+" + digits }
        return digits
    }

    func contains(_ phone: String) async throws -> Bool {
        try await authorize()
        return try matching(phone).contains { $0.phoneNumbers.contains { Self.canonical($0.value.stringValue) == Self.canonical(phone) } }
    }

    func all() async throws -> (contacts: [SharedContact], skipped: Int) {
        try await authorize()
        var result: [SharedContact] = []
        var scanned = 0, skipped = 0
        let request = CNContactFetchRequest(keysToFetch: keys)
        try store.enumerateContacts(with: request) { contact, stop in
            let name = [contact.givenName, contact.familyName]
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }.joined(separator: " ")
            let label = name.isEmpty ? contact.organizationName : name
            for number in contact.phoneNumbers {
                scanned += 1
                if scanned > 5000 { stop.pointee = true; break }
                if let entry = SharedContact.forSharing(label: label, phone: number.value.stringValue) {
                    result.append(entry)
                } else { skipped += 1 }
            }
        }
        guard scanned <= 5000 else { throw APIError.service(code: "contact_share_limit", status: 409) }
        return (result, skipped)
    }

    private func matching(_ phone: String) throws -> [CNContact] {
        try store.unifiedContacts(matching: CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: phone)), keysToFetch: keys)
    }
    private func backupURL(_ personID: UUID) throws -> URL {
        var directory = URL.applicationSupportDirectory.appending(path: "ContactRouting", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                                               attributes: [.protectionKey: FileProtectionType.complete])
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try directory.setResourceValues(values)
        return directory.appending(path: personID.uuidString + ".json")
    }
    private func backups(_ personID: UUID) throws -> [String: [ContactPhoneBackup]] {
        let url = try backupURL(personID)
        guard FileManager.default.fileExists(atPath: url.path) else { return [:] }
        return try JSONDecoder().decode([String: [ContactPhoneBackup]].self, from: Data(contentsOf: url))
    }

    func setEnabled(_ enabled: Bool, phone: String, label: String, personID: UUID) async throws {
        try await authorize()
        if enabled { try restore(phone: phone, label: label, personID: personID); return }
        let normalized = Self.canonical(phone), contacts = try matching(phone)
        var saved = try backups(personID)
        var removed = saved[normalized] ?? []
        let request = CNSaveRequest()
        for contact in contacts {
            let selected = contact.phoneNumbers.filter { Self.canonical($0.value.stringValue) == normalized }
            guard !selected.isEmpty, let mutable = contact.mutableCopy() as? CNMutableContact else { continue }
            for value in selected {
                let entry = ContactPhoneBackup(contactID: contact.identifier, givenName: contact.givenName,
                    familyName: contact.familyName, organization: contact.organizationName, label: value.label, value: value.value.stringValue)
                if !removed.contains(entry) { removed.append(entry) }
            }
            mutable.phoneNumbers.removeAll { Self.canonical($0.value.stringValue) == normalized }
            request.update(mutable)
        }
        saved[normalized] = removed
        // Durable backup before any contact field is changed. Never delete a contact card.
        try JSONEncoder().encode(saved).write(to: backupURL(personID), options: [.atomic, .completeFileProtection])
        try store.execute(request)
        guard try matching(phone).allSatisfy({ contact in
            !contact.phoneNumbers.contains { Self.canonical($0.value.stringValue) == normalized }
        }) else { throw APIError.service(code: "contact_change_unconfirmed", status: 409) }
    }

    private func restore(phone: String, label: String, personID: UUID) throws {
        let normalized = Self.canonical(phone), saved = try backups(personID)[normalized] ?? []
        let request = CNSaveRequest()
        var changed = false
        for group in Dictionary(grouping: saved, by: \.contactID).values {
            guard let first = group.first,
                  let original = try? store.unifiedContact(withIdentifier: first.contactID, keysToFetch: keys),
                  let mutable = original.mutableCopy() as? CNMutableContact else { continue }
            for value in group where !mutable.phoneNumbers.contains(where: { Self.canonical($0.value.stringValue) == Self.canonical(value.value) }) {
                mutable.phoneNumbers.append(CNLabeledValue(label: value.label, value: CNPhoneNumber(stringValue: value.value)))
                changed = true
            }
            request.update(mutable)
        }
        if changed { try store.execute(request) }
        if try matching(phone).contains(where: { $0.phoneNumbers.contains { Self.canonical($0.value.stringValue) == normalized } }) { return }
        let contact = CNMutableContact()
        contact.givenName = saved.first?.givenName ?? label
        contact.familyName = saved.first?.familyName ?? ""
        contact.organizationName = saved.first?.organization ?? ""
        contact.phoneNumbers = [CNLabeledValue(label: saved.first?.label ?? CNLabelPhoneNumberMain, value: CNPhoneNumber(stringValue: phone))]
        let add = CNSaveRequest(); add.add(contact, toContainerWithIdentifier: nil); try store.execute(add)
    }

    func hasRestoreCopies(personID: UUID) throws -> Bool {
        // A damaged restore copy must still offer the choice to discard it and
        // delete the account; decoding belongs to the optional restore action.
        FileManager.default.fileExists(atPath: try backupURL(personID).path)
    }
    func removeRestoreCopies(personID: UUID) throws {
        let url = try backupURL(personID)
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }

    func restoreAll(personID: UUID) async throws {
        try await authorize()
        for (phone, entries) in try backups(personID) {
            let name = entries.first.map { [$0.givenName, $0.familyName].filter { !$0.isEmpty }.joined(separator: " ") } ?? phone
            try restore(phone: phone, label: name, personID: personID)
        }
    }
    #if DEBUG && targetEnvironment(simulator)
    func verifySharingPreparation() async throws -> Bool {
        try await authorize()
        let unusual = CNMutableContact(), unnamed = CNMutableContact()
        unusual.givenName = String(repeating: "👨‍👩‍👧‍👦", count: 60)
        unusual.phoneNumbers = [
            CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: "+12025550183")),
            CNLabeledValue(label: CNLabelOther, value: CNPhoneNumber(stringValue: "12")),
            CNLabeledValue(label: CNLabelOther, value: CNPhoneNumber(stringValue: String(repeating: "9", count: 101)))
        ]
        unnamed.givenName = "   "
        unnamed.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: "+12025550184"))]
        let add = CNSaveRequest()
        add.add(unusual, toContainerWithIdentifier: nil); add.add(unnamed, toContainerWithIdentifier: nil)
        try store.execute(add)
        defer {
            let remove = CNSaveRequest()
            for contact in [unusual, unnamed] {
                if let current = try? store.unifiedContact(withIdentifier: contact.identifier, keysToFetch: keys),
                   let mutable = current.mutableCopy() as? CNMutableContact { remove.delete(mutable) }
            }
            try? store.execute(remove)
        }
        let prepared = try await all()
        guard prepared.skipped >= 2,
              let named = prepared.contacts.first(where: { Self.canonical($0.phone) == "+12025550183" }),
              named.label == String(repeating: "👨‍👩‍👧‍👦", count: 8),
              let fallback = prepared.contacts.first(where: { Self.canonical($0.phone) == "+12025550184" }),
              fallback.label == "+12025550184" else { return false }
        // Preparing an upload must never edit the address book.
        let original = try store.unifiedContact(withIdentifier: unusual.identifier, keysToFetch: keys)
        return original.givenName == unusual.givenName && original.phoneNumbers.count == 3
    }

    func verifyStorageRoundTrip() async throws -> Bool {
        try await authorize()
        let person = UUID(), phone = "+12025550181", secondPhone = "+12025550182"
        let contact = CNMutableContact(); contact.givenName = "Shield storage test"
        contact.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: phone)),
                                CNLabeledValue(label: CNLabelHome, value: CNPhoneNumber(stringValue: secondPhone))]
        contact.emailAddresses = [CNLabeledValue(label: CNLabelHome, value: "shield-test@example.invalid" as NSString)]
        let add = CNSaveRequest(); add.add(contact, toContainerWithIdentifier: nil); try store.execute(add)
        defer {
            if let current = try? store.unifiedContact(withIdentifier: contact.identifier, keysToFetch: keys),
               let mutable = current.mutableCopy() as? CNMutableContact {
                let remove = CNSaveRequest(); remove.delete(mutable); try? store.execute(remove)
            }
            if let url = try? backupURL(person) { try? FileManager.default.removeItem(at: url) }
        }
        try await setEnabled(false, phone: phone, label: "Test", personID: person)
        let removed = try store.unifiedContact(withIdentifier: contact.identifier, keysToFetch: keys + [CNContactEmailAddressesKey as CNKeyDescriptor])
        guard removed.phoneNumbers.count == 1, Self.canonical(removed.phoneNumbers[0].value.stringValue) == secondPhone,
              removed.emailAddresses.first?.value as String? == "shield-test@example.invalid" else { return false }
        try await setEnabled(true, phone: phone, label: "Test", personID: person)
        try await setEnabled(true, phone: phone, label: "Test", personID: person)
        let restored = try store.unifiedContact(withIdentifier: contact.identifier, keysToFetch: keys)
        guard restored.phoneNumbers.count == 2 && restored.phoneNumbers.contains(where: { Self.canonical($0.value.stringValue) == phone && $0.label == CNLabelPhoneNumberMobile }) else { return false }
        try Data("damaged restore copy".utf8).write(to: backupURL(person))
        guard try hasRestoreCopies(personID: person) else { return false }
        try removeRestoreCopies(personID: person)
        return try !hasRestoreCopies(personID: person)
    }
    #endif

}

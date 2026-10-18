import Contacts
import Foundation

/// Phone Contacts is the routing authority for this conditional-forwarding demo.
/// Only names/numbers cross the API boundary; removed phone fields stay locally restorable.
actor PhoneContacts {
    static let shared = PhoneContacts()
    private let store = CNContactStore()
    private var phoneParser: ContactPhoneParser?
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

    /// Formatting for the manual-entry form only; never compare saved Contacts with it.
    static func canonical(_ value: String) -> String {
        let digits = value.filter(\.isNumber)
        if value.trimmingCharacters(in: .whitespaces).hasPrefix("+") { return "+" + digits }
        if digits.count == 10 { return "+1" + digits }
        if digits.count == 11, digits.hasPrefix("1") { return "+" + digits }
        return digits
    }

    func contains(_ phone: String) async throws -> Bool {
        try await authorize()
        return try !matching(phone).isEmpty
    }

    /// Recovery on opening/foregrounding is read-only and never prompts for access.
    func containsIfAuthorized(_ phone: String) throws -> Bool? {
        guard CNContactStore.authorizationStatus(for: .contacts) == .authorized else { return nil }
        return try !matching(phone).isEmpty
    }

    func authorizeChange() async throws { try await authorize() }

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

    private func identity(_ value: String) throws -> ContactPhoneParser.Identity? {
        do {
            if phoneParser == nil { phoneParser = try ContactPhoneParser() }
            guard let phoneParser else { throw ContactPhoneParser.Failure.unavailable }
            return try phoneParser.identity(value)
        } catch { throw APIError.service(code: "contact_number_unavailable", status: 409) }
    }

    private func routingNumber(_ value: String) throws -> String {
        guard let number = try identity(value)?.number else {
            throw APIError.service(code: "contact_number_unavailable", status: 409)
        }
        return number
    }

    private func matching(_ phone: String) throws -> [CNContact] {
        let normalized = try routingNumber(phone)
        var contacts: [CNContact] = []
        let request = CNContactFetchRequest(keysToFetch: keys)
        // Native phone predicates do not consistently find extensions, Unicode digits
        // or international dialing prefixes. A complete local scan uses server identity.
        try store.enumerateContacts(with: request) { contact, _ in contacts.append(contact) }
        return try contacts.filter { contact in
            try contact.phoneNumbers.contains { try identity($0.value.stringValue)?.number == normalized }
        }
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

    private func saveBackups(_ saved: [String: [ContactPhoneBackup]], personID: UUID) throws {
        if saved.isEmpty { try removeRestoreCopies(personID: personID) }
        else { try JSONEncoder().encode(saved).write(to: backupURL(personID), options: [.atomic, .completeFileProtection]) }
    }

    func setEnabled(_ enabled: Bool, phone: String, label: String, personID: UUID) async throws {
        try await authorize()
        if enabled { try restore(phone: phone, label: label, personID: personID); return }
        let normalized = try routingNumber(phone), contacts = try matching(phone)
        var saved = try backups(personID)
        var removed = saved[normalized] ?? []
        let request = CNSaveRequest()
        for contact in contacts {
            let selected = try contact.phoneNumbers.filter { try identity($0.value.stringValue)?.number == normalized }
            guard !selected.isEmpty, let mutable = contact.mutableCopy() as? CNMutableContact else { continue }
            var occurrences: [ContactPhoneBackup: Int] = [:]
            for value in selected {
                let entry = ContactPhoneBackup(contactID: contact.identifier, givenName: contact.givenName,
                    familyName: contact.familyName, organization: contact.organizationName, label: value.label, value: value.value.stringValue)
                occurrences[entry, default: 0] += 1
                if removed.count(where: { $0 == entry }) < occurrences[entry, default: 0] { removed.append(entry) }
            }
            let selectedIDs = Set(selected.map(\.identifier))
            mutable.phoneNumbers.removeAll { selectedIDs.contains($0.identifier) }
            request.update(mutable)
        }
        saved[normalized] = removed.isEmpty ? nil : removed
        // Durable backup before any contact field is changed. Never delete a contact card.
        try saveBackups(saved, personID: personID)
        try store.execute(request)
        guard try matching(phone).isEmpty else { throw APIError.service(code: "contact_change_unconfirmed", status: 409) }
    }

    private func restore(phone: String, label: String, personID: UUID) throws {
        let normalized = try routingNumber(phone)
        var savedByNumber = try backups(personID)
        let saved = savedByNumber[normalized] ?? []
        let request = CNSaveRequest()
        var matches = try matching(normalized)
        var changed = false
        var groups: [(values: [ContactPhoneBackup], original: CNContact?)] = []
        var restoredFields: [(contact: CNMutableContact, values: [ContactPhoneBackup])] = []
        for group in Dictionary(grouping: saved, by: \.contactID).values {
            guard let first = group.first else { continue }
            for value in group {
                guard try routingNumber(value.value) == normalized else {
                    throw APIError.service(code: "contact_restore_unconfirmed", status: 409)
                }
            }
            let original: CNContact?
            do { original = try store.unifiedContact(withIdentifier: first.contactID, keysToFetch: keys) }
            catch let error as NSError where error.domain == CNErrorDomain && error.code == CNError.Code.recordDoesNotExist.rawValue {
                original = nil
            }
            groups.append((group, original))
        }
        // Restore surviving cards first. A later removal may have backed up a
        // replacement card as well as its deleted predecessor; reuse that pending copy.
        for (group, original) in groups.sorted(by: { $0.original != nil && $1.original == nil }) {
            guard let first = group.first else { continue }
            // If the original card was deleted, reuse an already restored copy.
            // This also makes a retry safe after a save succeeded but its reply was lost.
            let restoredCopy = matches.first { contact in
                contact.givenName == first.givenName && contact.familyName == first.familyName && contact.organizationName == first.organization &&
                Dictionary(grouping: group, by: { $0 }).allSatisfy { value, copies in
                    contact.phoneNumbers.count(where: { $0.label == value.label && $0.value.stringValue == value.value }) >= copies.count
                }
            }
            let source = original ?? restoredCopy
            let mutable: CNMutableContact
            if let source {
                guard let copy = source.mutableCopy() as? CNMutableContact else {
                    throw APIError.service(code: "contact_restore_unconfirmed", status: 409)
                }
                mutable = copy
            } else { mutable = CNMutableContact() }
            if source == nil {
                mutable.givenName = first.givenName; mutable.familyName = first.familyName
                mutable.organizationName = first.organization
            }
            var cardChanged = false, occurrences: [ContactPhoneBackup: Int] = [:]
            // Keep each original value and label, including distinct extensions or
            // differently formatted fields. Repeating restore adds no duplicate fields.
            for value in group {
                occurrences[value, default: 0] += 1
                if mutable.phoneNumbers.count(where: { $0.label == value.label && $0.value.stringValue == value.value }) < occurrences[value, default: 0] {
                    mutable.phoneNumbers.append(CNLabeledValue(label: value.label, value: CNPhoneNumber(stringValue: value.value)))
                    cardChanged = true
                }
            }
            if cardChanged {
                if source == nil { request.add(mutable, toContainerWithIdentifier: nil) }
                else { request.update(mutable) }
                matches.append(mutable)
                changed = true
            }
            restoredFields.append((mutable, group))
        }
        if saved.isEmpty && matches.isEmpty {
            let contact = CNMutableContact(); contact.givenName = label
            contact.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMain, value: CNPhoneNumber(stringValue: phone))]
            request.add(contact, toContainerWithIdentifier: nil); changed = true
        }
        if changed { try store.execute(request) }
        guard try !matching(phone).isEmpty else { throw APIError.service(code: "contact_restore_unconfirmed", status: 409) }
        for (contact, values) in restoredFields {
            let current = try store.unifiedContact(withIdentifier: contact.identifier, keysToFetch: keys)
            guard Dictionary(grouping: values, by: { $0 }).allSatisfy({ value, copies in
                current.phoneNumbers.count(where: { $0.label == value.label && $0.value.stringValue == value.value }) >= copies.count
            }) else { throw APIError.service(code: "contact_restore_unconfirmed", status: 409) }
        }
        // Consume a backup only after every original field has been read back.
        // Account deletion must not resurrect a card the person deleted after restoring it.
        if savedByNumber.removeValue(forKey: normalized) != nil {
            try saveBackups(savedByNumber, personID: personID)
        }
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
        for (phone, entries) in try backups(personID) where !entries.isEmpty {
            let name = entries.first.map { [$0.givenName, $0.familyName].filter { !$0.isEmpty }.joined(separator: " ") } ?? phone
            try restore(phone: phone, label: name, personID: personID)
        }
    }
    #if DEBUG && targetEnvironment(simulator)
    func prepareRecoveryFixture() async throws {
        try await authorize()
        let phone = ContactRecoveryFixture.phone
        // Reset only this fixture's reserved synthetic number/cards on the simulator.
        let request = CNSaveRequest()
        for card in try matching(phone) {
            guard card.givenName == "Synthetic contact recovery", let mutable = card.mutableCopy() as? CNMutableContact else {
                throw APIError.invalidResponse
            }
            request.delete(mutable)
        }
        let contact = CNMutableContact(); contact.givenName = "Synthetic contact recovery"
        contact.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: phone))]
        request.add(contact, toContainerWithIdentifier: nil); try store.execute(request)
        try removeRestoreCopies(personID: ContactRecoveryFixture.person)
    }

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

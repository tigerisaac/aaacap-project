#if DEBUG && targetEnvironment(simulator)
import Contacts
import Foundation

/// Native address-book checks using only temporary synthetic cards on the simulator.
@MainActor
enum ContactNumberIdentityCheck {
    private struct Sample: Decodable {
        let id: String
        let raw: String
        let normalized: String
        let extra: [String]?
        let deleteOriginal: Bool?
        let secondCard: Bool?
    }

    static func run() async throws -> String {
        let samples = try JSONDecoder().decode([Sample].self, from: Data(#"[{"id":"ordinary","raw":"(202) 555-0181","normalized":"+12025550181"},{"id":"country-code","raw":"+1 202 555 0181","normalized":"+12025550181"},{"id":"extension-words","raw":"(202) 555-0181 ext. 23","normalized":"+12025550181"},{"id":"extension-x","raw":"(202) 555-0181 x23","normalized":"+12025550181"},{"id":"extension-rfc3966","raw":"tel:+1-202-555-0181;ext=23","normalized":"+12025550181"},{"id":"extension-pause","raw":"(202) 555-0181,23","normalized":"+12025550181"},{"id":"arabic-indic-digits","raw":"(٢٠٢) ٥٥٥-٠١٨١","normalized":"+12025550181"},{"id":"fullwidth-digits","raw":"(２０２) ５５５-０１８１","normalized":"+12025550181"},{"id":"international-prefix","raw":"011 44 20 7946 0182","normalized":"+442079460182"},{"id":"international-trunk-prefix","raw":"+44 (0)20 7946 0182","normalized":"+442079460182"},{"id":"international-plain","raw":"+44 20 7946 0182","normalized":"+442079460182"},{"id":"two-extensions","raw":"(202) 555-0181 ext. 23","normalized":"+12025550181","extra":["(202) 555-0181 x24"]},{"id":"same-number-formats","raw":"(202) 555-0181","normalized":"+12025550181","extra":["+1 202 555 0181"]},{"id":"identical-fields","raw":"(202) 555-0181 ext. 23","normalized":"+12025550181","extra":["(202) 555-0181 ext. 23"]},{"id":"deleted-card-extensions","raw":"(202) 555-0181 ext. 23","normalized":"+12025550181","extra":["(202) 555-0181 x24"],"deleteOriginal":true},{"id":"multiple-cards","raw":"+44 (0)20 7946 0182","normalized":"+442079460182","extra":[],"secondCard":true}]"#.utf8))
        var reports: [[String: Any]] = []
        for sample in samples { reports.append(await check(sample)) }
        return String(decoding: try JSONSerialization.data(withJSONObject: reports, options: [.sortedKeys]), as: UTF8.self)
    }

    private static func check(_ sample: Sample) async -> [String: Any] {
        let store = CNContactStore(), person = UUID()
        let fixtureName = "Shield number identity fixture " + UUID().uuidString
        let keys: [CNKeyDescriptor] = [CNContactIdentifierKey, CNContactGivenNameKey, CNContactPhoneNumbersKey,
                                      CNContactEmailAddressesKey].map { $0 as CNKeyDescriptor }
        func fixtureCards() throws -> [CNContact] {
            var cards: [CNContact] = []
            try store.enumerateContacts(with: CNContactFetchRequest(keysToFetch: keys)) { contact, _ in
                if contact.givenName == fixtureName || contact.givenName == fixtureName + " second" { cards.append(contact) }
            }
            return cards
        }
        func fields(_ contact: CNContact) -> [String] {
            contact.phoneNumbers.map { ($0.label ?? "") + " / " + $0.value.stringValue }.sorted()
        }
        var report: [String: Any] = ["case": sample.id,
                                    "authorizationStatus": CNContactStore.authorizationStatus(for: .contacts).rawValue]
        var stage = "prepare"
        do {
            guard CNContactStore.authorizationStatus(for: .contacts) == .authorized else {
                throw APIError.service(code: "full_contacts_required", status: 403)
            }
            let existing = try store.unifiedContacts(matching: CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: sample.normalized)), keysToFetch: keys)
            guard existing.isEmpty else { throw APIError.service(code: "fixture_phone_already_present", status: 409) }
            try await PhoneContacts.shared.setEnabled(false, phone: sample.normalized, label: fixtureName, personID: person)
            report["absentRemovalHasNoBackup"] = try await !PhoneContacts.shared.hasRestoreCopies(personID: person)
            let add = CNSaveRequest()
            for index in 0..<(sample.secondCard == true ? 2 : 1) {
                let contact = CNMutableContact()
                contact.givenName = fixtureName + (index == 0 ? "" : " second")
                contact.phoneNumbers = ([sample.raw] + (sample.extra ?? [])).map {
                    CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: $0))
                } + [CNLabeledValue(label: CNLabelHome, value: CNPhoneNumber(stringValue: "+12025550189"))]
                contact.emailAddresses = [CNLabeledValue(label: CNLabelHome, value: "contact-identity@example.invalid" as NSString)]
                add.add(contact, toContainerWithIdentifier: nil)
            }
            try store.execute(add)
            let originals = try fixtureCards()
            guard originals.count == (sample.secondCard == true ? 2 : 1) else { throw APIError.invalidResponse }
            report["recognizedBeforeRemoval"] = try await PhoneContacts.shared.contains(sample.normalized)
            report["passiveReadBeforeRemoval"] = try await PhoneContacts.shared.containsIfAuthorized(sample.normalized) == true
            stage = "remove"
            try await PhoneContacts.shared.setEnabled(false, phone: sample.normalized, label: fixtureName, personID: person)
            report["removalReturnedSuccess"] = true
            let removed = try fixtureCards()
            report["exactFieldRemoved"] = removed.count == originals.count && removed.allSatisfy {
                $0.phoneNumbers.count == 1 && $0.phoneNumbers.first?.label == CNLabelHome
            }
            report["unrelatedFieldsPreserved"] = removed.allSatisfy { card in
                originals.contains { $0.givenName == card.givenName && $0.emailAddresses == card.emailAddresses &&
                    fields($0).filter { $0.hasPrefix(CNLabelHome) } == fields(card) }
            }
            report["absentAfterRemoval"] = !(try await PhoneContacts.shared.contains(sample.normalized))
            report["passiveReadAfterRemoval"] = try await PhoneContacts.shared.containsIfAuthorized(sample.normalized) == false
            guard report["exactFieldRemoved"] as? Bool == true else {
                throw APIError.service(code: "contact_change_unconfirmed", status: 409)
            }
            if sample.deleteOriginal == true {
                let remove = CNSaveRequest()
                for card in removed { if let mutable = card.mutableCopy() as? CNMutableContact { remove.delete(mutable) } }
                try store.execute(remove)
                guard try fixtureCards().isEmpty else { throw APIError.invalidResponse }
            }
            func expectedFields(_ original: CNContact) -> [String] {
                sample.deleteOriginal == true ? fields(original).filter { !$0.hasPrefix(CNLabelHome) } : fields(original)
            }
            func restoredExactly(_ cards: [CNContact]) -> Bool {
                cards.count == originals.count && originals.allSatisfy { original in
                    cards.contains { $0.givenName == original.givenName && fields($0) == expectedFields(original) }
                }
            }
            stage = "restore"
            try await PhoneContacts.shared.setEnabled(true, phone: sample.normalized, label: fixtureName, personID: person)
            report["originalFieldsRestored"] = restoredExactly(try fixtureCards())
            report["restoredBackupConsumed"] = try await !PhoneContacts.shared.hasRestoreCopies(personID: person)
            try await PhoneContacts.shared.setEnabled(true, phone: sample.normalized, label: fixtureName, personID: person)
            report["repeatRestoreHasNoDuplicates"] = restoredExactly(try fixtureCards())
            report["recognizedAfterRestore"] = try await PhoneContacts.shared.contains(sample.normalized)
            stage = "second-cycle"
            try await PhoneContacts.shared.setEnabled(false, phone: sample.normalized, label: fixtureName, personID: person)
            try await PhoneContacts.shared.setEnabled(true, phone: sample.normalized, label: fixtureName, personID: person)
            report["secondCycleRestoresExactly"] = restoredExactly(try fixtureCards())
            report["secondCycleBackupConsumed"] = try await !PhoneContacts.shared.hasRestoreCopies(personID: person)
            let deleteRestoredCards = CNSaveRequest()
            for card in try fixtureCards() {
                guard let mutable = card.mutableCopy() as? CNMutableContact else { throw APIError.invalidResponse }
                deleteRestoredCards.delete(mutable)
            }
            try store.execute(deleteRestoredCards)
            try await PhoneContacts.shared.restoreAll(personID: person)
            report["completedRestoreDoesNotResurrectDeletedCards"] = try fixtureCards().isEmpty
        } catch {
            report["failedStage"] = stage
            report["errorType"] = String(reflecting: type(of: error))
            if case let APIError.service(code, _) = error { report["errorCode"] = code }
        }
        do {
            let remove = CNSaveRequest()
            for card in try fixtureCards() {
                guard let mutable = card.mutableCopy() as? CNMutableContact else { throw APIError.invalidResponse }
                remove.delete(mutable)
            }
            try store.execute(remove)
            try await PhoneContacts.shared.removeRestoreCopies(personID: person)
            report["cleanupSucceeded"] = try fixtureCards().isEmpty
        } catch { report["cleanupSucceeded"] = false }
        return report
    }
}
#endif

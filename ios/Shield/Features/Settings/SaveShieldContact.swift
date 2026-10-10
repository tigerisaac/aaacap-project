import Contacts
import Foundation

enum SaveShieldContact {
    static func save(number: String) async throws {
        let store = CNContactStore()
        guard try await store.requestAccess(for: .contacts) else { throw APIError.service(code: "contact_permission", status: 403) }
        let key = "shield-contact-" + number
        if let identifier = UserDefaults.standard.string(forKey: key),
           let _ = try? store.unifiedContact(withIdentifier: identifier, keysToFetch: [CNContactIdentifierKey as CNKeyDescriptor]) { return }
        let contact = CNMutableContact()
        contact.givenName = "Shield"
        contact.familyName = "Screened call"
        contact.organizationName = "Identity not verified"
        contact.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMain, value: CNPhoneNumber(stringValue: number))]
        let request = CNSaveRequest()
        request.add(contact, toContainerWithIdentifier: nil)
        try store.execute(request)
        UserDefaults.standard.set(contact.identifier, forKey: key)
    }
}

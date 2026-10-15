import ContactsUI
import SwiftUI

/// Apple's picker shares only the selected name and phone number; no address-book upload.
struct TrustedContactPicker: UIViewControllerRepresentable {
    let onSelect: (String, String) -> Void
    let onCancel: () -> Void
    func makeUIViewController(context: Context) -> CNContactPickerViewController {
        let picker = CNContactPickerViewController()
        picker.delegate = context.coordinator
        picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
        picker.predicateForEnablingContact = NSPredicate(format: "phoneNumbers.@count > 0")
        picker.predicateForSelectionOfContact = NSPredicate(value: false)
        picker.predicateForSelectionOfProperty = NSPredicate(format: "key == 'phoneNumbers'")
        return picker
    }
    func updateUIViewController(_ controller: CNContactPickerViewController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(onSelect: onSelect, onCancel: onCancel) }
    final class Coordinator: NSObject, CNContactPickerDelegate {
        let onSelect: (String, String) -> Void
        let onCancel: () -> Void
        init(onSelect: @escaping (String, String) -> Void, onCancel: @escaping () -> Void) { self.onSelect = onSelect; self.onCancel = onCancel }
        func contactPickerDidCancel(_ picker: CNContactPickerViewController) { onCancel() }
        func contactPicker(_ picker: CNContactPickerViewController, didSelect property: CNContactProperty) {
            guard let phone = property.value as? CNPhoneNumber else { return }
            onSelect(CNContactFormatter.string(from: property.contact, style: .fullName) ?? "", phone.stringValue)
        }
    }
}

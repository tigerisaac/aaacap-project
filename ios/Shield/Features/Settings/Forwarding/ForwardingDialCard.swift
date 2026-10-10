import Contacts
import ContactsUI
import SwiftUI

/// A temporary native card. It never saves a contact or advances setup.
struct ForwardingDialCard: UIViewControllerRepresentable {
    let code: String
    let title: String
    let blocksDialing: Bool
    let onClose: () -> Void
    let onBlockedAction: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(blocksDialing: blocksDialing, onClose: onClose, onBlockedAction: onBlockedAction)
    }

    func makeUIViewController(context: Context) -> UINavigationController {
        let contact = CNMutableContact()
        contact.givenName = "Shield · Tello setup"
        contact.phoneNumbers = [CNLabeledValue(label: title, value: CNPhoneNumber(stringValue: code))]
        let card = CNContactViewController(for: contact)
        card.allowsActions = !blocksDialing
        card.allowsEditing = false
        card.displayedPropertyKeys = [CNContactPhoneNumbersKey]
        card.message = blocksDialing ? "Demo preview: carrier actions are disabled." : "Tap the forwarding code to ask Tello to apply it. Return to Shield after Tello confirms."
        card.delegate = context.coordinator
        card.navigationItem.rightBarButtonItem = UIBarButtonItem(
            title: "Back to Shield", style: .plain, target: context.coordinator, action: #selector(Coordinator.close))
        return UINavigationController(rootViewController: card)
    }

    func updateUIViewController(_ controller: UINavigationController, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, @preconcurrency CNContactViewControllerDelegate {
        let blocksDialing: Bool
        let onClose: () -> Void
        let onBlockedAction: () -> Void

        init(blocksDialing: Bool, onClose: @escaping () -> Void, onBlockedAction: @escaping () -> Void) {
            self.blocksDialing = blocksDialing
            self.onClose = onClose
            self.onBlockedAction = onBlockedAction
        }

        @objc func close() { onClose() }

        func contactViewController(_ viewController: CNContactViewController, shouldPerformDefaultActionFor property: CNContactProperty) -> Bool {
            guard property.key == CNContactPhoneNumbersKey else { return false }
            if blocksDialing {
                onBlockedAction()
                onClose()
                return false
            }
            // Only the person's explicit tap invokes the system action.
            // No call URL, forwarding command, or success flag is issued by Shield.
            return true
        }
    }
}

#if DEBUG
import SwiftUI
import UIKit

/// The native Open In menu omits contact suggestions and unrelated sharing actions.
struct SetupShortcutImportAnchor: UIViewRepresentable {
    let request: UUID?
    let onHandoff: () -> Void
    let onUnavailable: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ view: UIView, context: Context) {
        guard let request, context.coordinator.lastRequest != request else { return }
        context.coordinator.lastRequest = request
        context.coordinator.onHandoff = onHandoff
        context.coordinator.onUnavailable = onUnavailable
        context.coordinator.present(from: view)
    }

    @MainActor
    final class Coordinator: NSObject, @preconcurrency UIDocumentInteractionControllerDelegate {
        var lastRequest: UUID?
        var onHandoff: (() -> Void)?
        var onUnavailable: (() -> Void)?
        private var controller: UIDocumentInteractionController?

        func present(from view: UIView) {
            guard let file = Bundle.main.url(forResource: "Shield Call Silencing", withExtension: "shortcut") else {
                onUnavailable?()
                return
            }
            let controller = UIDocumentInteractionController(url: file)
            controller.delegate = self
            self.controller = controller
            // Run after the SwiftUI update so presentation never mutates its state mid-update.
            Task { @MainActor [weak self, weak view] in
                guard let self, let view, view.window != nil else { return }
                if !controller.presentOpenInMenu(from: view.bounds, in: view, animated: true) {
                    self.onUnavailable?()
                }
            }
        }

        func documentInteractionController(_ controller: UIDocumentInteractionController,
                                           didEndSendingToApplication application: String?) {
            // File handoff is not evidence that Add Shortcut was accepted or the action ran.
            onHandoff?()
        }
    }
}
#endif

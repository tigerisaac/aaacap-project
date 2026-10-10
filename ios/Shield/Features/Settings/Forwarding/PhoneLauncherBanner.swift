import SwiftUI
import StoreKit

/// Presents Apple’s Phone launcher in the window scene, independent of scroll layout.
struct PhoneLauncherBanner: ViewModifier {
    @Binding var isPresented: Bool

    func body(content: Content) -> some View {
        content.background {
            PhoneLauncherAnchor(isPresented: $isPresented).frame(width: 0, height: 0)
        }
    }
}

private struct PhoneLauncherAnchor: UIViewControllerRepresentable {
    @Binding var isPresented: Bool

    func makeUIViewController(context: Context) -> Controller { Controller() }

    func updateUIViewController(_ controller: Controller, context: Context) {
        controller.onDismiss = { isPresented = false }
        controller.requestPresentation(isPresented)
    }

    static func dismantleUIViewController(_ controller: Controller, coordinator: ()) {
        controller.requestPresentation(false)
    }

    @MainActor final class Controller: UIViewController, @MainActor SKOverlayDelegate {
        var onDismiss: (() -> Void)?
        private var requested = false
        private var overlay: SKOverlay?

        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            presentIfReady()
        }

        func requestPresentation(_ value: Bool) {
            requested = value
            if value {
                presentIfReady()
            } else if overlay != nil, let scene = view.window?.windowScene {
                SKOverlay.dismiss(in: scene)
                overlay = nil
            }
        }

        func storeOverlayDidFinishDismissal(_ overlay: SKOverlay, transitionContext: SKOverlay.TransitionContext) {
            guard self.overlay === overlay else { return }
            self.overlay = nil
            requested = false
            onDismiss?()
        }

        func storeOverlayDidFailToLoad(_ overlay: SKOverlay, error: any Error) {
            guard self.overlay === overlay else { return }
            self.overlay = nil
            requested = false
            onDismiss?()
        }

        private func presentIfReady() {
            guard requested, overlay == nil, let scene = view.window?.windowScene else { return }
            let configuration = SKOverlay.AppConfiguration(appIdentifier: "1146562108", position: .bottomRaised)
            let launcher = SKOverlay(configuration: configuration)
            overlay = launcher
            launcher.delegate = self
            launcher.present(in: scene)
        }
    }
}

extension View {
    func phoneLauncherBanner(isPresented: Binding<Bool>) -> some View {
        modifier(PhoneLauncherBanner(isPresented: isPresented))
    }
}

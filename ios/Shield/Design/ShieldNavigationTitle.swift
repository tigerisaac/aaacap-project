import SwiftUI

/// Native titles track the visible destination and restore without a custom toolbar item.
struct ShieldNavigationTitle: ViewModifier {
    let title: String
    @Environment(\.shieldNavigationRoot) private var isRoot

    func body(content: Content) -> some View {
        content
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(isRoot ? .large : .inline)
    }
}

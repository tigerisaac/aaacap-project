#if DEBUG
import SwiftUI

/// Review the native import flow before considering it for normal setup.
/// This screen never runs the shortcut or changes a phone setting.
struct SetupShortcutPreview: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("A simpler call setup")
                    .font(.largeTitle).bold()
                Text("Tap Shortcuts, then Add Shortcut. It contains one iPhone action: turn Silence Unknown Callers on. Adding it does not run it.")
                if let file = Bundle.main.url(forResource: "Shield Call Silencing", withExtension: "shortcut") {
                    ShareLink(item: file) {
                        Text("Add call setup").foregroundStyle(ShieldTheme.actionInk)
                    }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .accessibilityIdentifier("setup-shortcut-add")
                } else {
                    Text("The preview file is unavailable.")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
    }
}
#endif

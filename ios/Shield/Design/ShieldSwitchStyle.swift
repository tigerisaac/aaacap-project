import SwiftUI

/// Retain the familiar iPhone switch, with the entire labeled row as its touch target.
struct ShieldSwitchStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: {
            HStack(spacing: ShieldTheme.Spacing.content) {
                configuration.label
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Toggle("", isOn: configuration.$isOn)
                    .toggleStyle(.switch).labelsHidden()
                    .fixedSize().allowsHitTesting(false).accessibilityHidden(true)
            }
            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityRepresentation {
            Toggle(isOn: configuration.$isOn) { configuration.label }
                .toggleStyle(.switch)
        }
    }
}

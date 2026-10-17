import SwiftUI

/// Retain the familiar iPhone switch, with the entire labeled row as its touch target.
struct ShieldSwitchStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: ShieldTheme.Spacing.content) {
                    configuration.label.fixedSize()
                    Spacer(minLength: 0)
                    indicator(configuration)
                }
                // Give long labels their full reading width instead of splitting a word
                // around the switch. The entire row remains one native-accessible toggle.
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                    configuration.label
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    indicator(configuration)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
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

    private func indicator(_ configuration: Configuration) -> some View {
        Toggle("", isOn: configuration.$isOn)
            .toggleStyle(.switch).labelsHidden()
            .fixedSize().allowsHitTesting(false).accessibilityHidden(true)
    }
}

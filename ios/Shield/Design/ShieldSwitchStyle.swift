import SwiftUI

/// Retain the familiar iPhone switch, with the entire labeled row as its touch target.
struct ShieldSwitchStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View { SwitchRow(configuration: configuration) }

    private struct SwitchRow: View {
        let configuration: Configuration
        @Environment(\.shieldInListRow) private var inListRow
        var body: some View { ShieldSwitchStyle.body(configuration, inListRow: inListRow) }
    }

    fileprivate static func body(_ configuration: Configuration, inListRow: Bool) -> some View {
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
            // A list row already measures 52 points; standalone switches supply it themselves.
            .frame(minHeight: inListRow ? nil : ShieldTheme.Layout.minimumTarget)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        // ToggleStyle inherits the native switch semantics. A hidden replacement
        // would give the label a separate layout that cannot follow this wrapping.
    }

    private static func indicator(_ configuration: Configuration) -> some View {
        Toggle("", isOn: configuration.$isOn)
            .toggleStyle(.switch).labelsHidden()
            .fixedSize().allowsHitTesting(false).accessibilityHidden(true)
    }
}

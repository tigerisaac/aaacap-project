import SwiftUI

/// Shared native phone entry. Formatting waits until editing ends to preserve the caret.
struct ShieldPhoneEntry<Field: Hashable>: View {
    @Binding var text: String
    var focus: FocusState<Field?>.Binding
    let field: Field
    let title: String
    let identifier: String
    var mobileOnly = false
    var allowsClear = false
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline) {
                    Text(title).font(.headline).fixedSize()
                    Spacer(minLength: ShieldTheme.Spacing.regular)
                    region.fixedSize()
                }
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                    Text(title).font(.headline)
                    region
                }
            }
            ZStack(alignment: .trailing) {
                TextField(title, text: $text,
                      prompt: Text(typeSize.isAccessibilitySize ? "Number" : "(201) 555-0123").foregroundStyle(ShieldTheme.secondaryText))
                .font(.title3.monospacedDigit())
                .textContentType(.telephoneNumber).keyboardType(.phonePad)
                .textInputAutocapitalization(.never).autocorrectionDisabled()
                .focused(focus, equals: field)
                .padding(.leading, typeSize.isAccessibilitySize ? 0 : ShieldTheme.Spacing.section)
                .padding(.trailing, allowsClear && focus.wrappedValue == field && !text.isEmpty ? ShieldTheme.Layout.minimumTarget : 0)
                .shieldField(focused: focus.wrappedValue == field)
                .overlay(alignment: .leading) {
                    if !typeSize.isAccessibilitySize {
                        Image(systemName: "phone").foregroundStyle(ShieldTheme.secondaryText)
                            .padding(.leading, ShieldTheme.Spacing.content)
                            .accessibilityHidden(true).allowsHitTesting(false)
                    }
                }
                .accessibilityIdentifier(identifier)
                .accessibilityLabel(title)
                .accessibilityHint(mobileOnly ? "US or Canadian mobile number" : "US or Canadian phone number")
                if allowsClear, focus.wrappedValue == field, !text.isEmpty {
                    Button("Clear", systemImage: "xmark.circle.fill") { text = "" }
                        .labelStyle(.iconOnly).foregroundStyle(ShieldTheme.secondaryText)
                        .frame(width: ShieldTheme.Layout.minimumTarget, height: ShieldTheme.Layout.minimumTarget)
                        .contentShape(.rect)
                        .accessibilityLabel("Clear phone number")
                        .accessibilityInputLabels(["Clear", "Clear phone number"])
                }
            }
        }
        .onChange(of: focus.wrappedValue) { old, new in
            if old == field, new != field, let number = MobileNumber.normalized(text) {
                text = PhoneDisplay.format(number)
            }
        }
    }

    private var region: some View {
        Text("US & Canada").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
    }
}

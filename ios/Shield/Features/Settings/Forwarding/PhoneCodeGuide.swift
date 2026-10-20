import SwiftUI

struct PhoneCodeGuide: View {
    var restoring = false
    var returned = false
    var carrier = "your carrier"
    var showingHeading = true
    @AccessibilityFocusState private var resultFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
            if returned {
                if showingHeading {
                    Text("Did \(carrier) say it worked?").shieldHeading(.title)
                        .accessibilityAddTraits(.isHeader).accessibilityFocused($resultFocused)
                }
                Text(restoring
                     ? "Continue only after \(carrier) says the reset worked."
                     : carrier == "Verizon"
                        ? "Continue only if you heard \(carrier)’s confirmation tones."
                        : "Continue only if Phone showed “Setting Registration Succeeded” for Voice Call Forwarding.")
                    .accessibilityIdentifier("forwarding-carrier-result")
            } else {
                SetupInstruction(number: 1, title: "Open Keypad", detail: "In Phone, tap Keypad if needed.")
                SetupInstruction(number: 2, title: "Paste your code", detail: "Tap above the numbers, then Paste.")
                SetupInstruction(number: 3, title: "Tap Call", detail: "Wait for \(carrier)’s result. Return to Shield.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .onChange(of: returned) { _, value in resultFocused = value }
    }
}

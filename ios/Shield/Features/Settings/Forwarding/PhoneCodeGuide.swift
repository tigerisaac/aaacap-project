import SwiftUI

struct PhoneCodeGuide: View {
    var restoring = false
    var returned = false
    @AccessibilityFocusState private var resultFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if returned {
                Text("Did Tello say it worked?").font(.title2.bold())
                    .accessibilityIdentifier("forwarding-carrier-result")
                    .accessibilityAddTraits(.isHeader).accessibilityFocused($resultFocused)
                Text(restoring
                     ? "Continue only after Tello says the reset worked."
                     : "Look for “Setting Registration Succeeded” under “Voice Call Forwarding.”")
            } else {
                SetupInstruction(number: 1, title: "Open Phone", detail: "Tap Open on the banner. Choose Keypad.")
                SetupInstruction(number: 2, title: "Paste your code", detail: "Tap above the numbers, then Paste.")
                SetupInstruction(number: 3, title: "Tap Call", detail: "Wait for Tello’s result. Then return to Shield.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .onChange(of: returned) { _, value in resultFocused = value }
    }
}

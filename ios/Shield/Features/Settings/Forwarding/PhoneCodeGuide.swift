import SwiftUI

struct PhoneCodeGuide: View {
    var restoring = false
    var returned = false
    @AccessibilityFocusState private var resultFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if returned {
                Text("Check Tello’s result").font(.title2.bold())
                    .accessibilityIdentifier("forwarding-carrier-result")
                    .accessibilityAddTraits(.isHeader).accessibilityFocused($resultFocused)
                Text(restoring
                     ? "Continue only after Tello confirms this reset. Returning to Shield does not confirm it."
                     : "Continue only if Tello showed Setting Registration Succeeded for Voice Call Forwarding.")
            } else {
                SetupInstruction(number: 1, title: "Open Phone", detail: "Tap Open below, then choose Keypad.")
                SetupInstruction(number: 2, title: "Paste your code", detail: "Tap above the numbers, then Paste.")
                SetupInstruction(number: 3, title: "Call and wait", detail: "Wait for Tello’s confirmation. Then tap Shield at the top left to return here.")
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .onChange(of: returned) { _, value in resultFocused = value }
    }
}

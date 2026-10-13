import SwiftUI

struct RestorationCallCheck: View {
    @Binding var index: Int
    private var answering: Bool { index == 5 }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(answering ? "Check that calls reach you" : "Check your normal voicemail")
                .font(ShieldTheme.Typography.title).accessibilityAddTraits(.isHeader)
            SetupInstruction(number: 1, title: "Ask your helper to call", detail: answering
                             ? "Use another phone to call your usual number."
                             : "Ask them to call your usual number again.")
            SetupInstruction(number: 2, title: answering ? "Answer the call" : "Let it go unanswered", detail: answering
                             ? "Check that you can hear each other."
                             : "Have them leave a short message at your normal voicemail greeting.")
            if !answering {
                SetupInstruction(number: 3, title: "Listen to the message", detail: "Open Phone and listen to the new voicemail message.")
            }
            Text("Confirm below when it works. Keep Shield until both checks pass.")
                .foregroundStyle(ForwardingStyle.secondaryText)
            DisclosureGroup("The check didn’t work") {
                Text("Stop and ask your helper or your carrier to bring back ordinary calls and voicemail. Keep Shield installed.")
                    .padding(.top, 8).foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

import SwiftUI

struct RestorationCallCheck: View {
    @Binding var index: Int
    private var answering: Bool { index == 5 }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Ordinary calls · \(answering ? 1 : 2) of 2").foregroundStyle(ForwardingStyle.secondaryText)
            Text(answering ? "Check that calls reach you" : "Check your normal voicemail")
                .font(.title2.bold()).accessibilityAddTraits(.isHeader)
            SetupInstruction(number: 1, title: "Ask your helper to call", detail: answering
                             ? "Use another phone to call your usual number."
                             : "Ask them to call your usual number again.")
            SetupInstruction(number: 2, title: answering ? "Answer the call" : "Let it go unanswered", detail: answering
                             ? "Check that you can hear each other."
                             : "Have them leave a short message at your normal voicemail greeting.")
            if !answering {
                SetupInstruction(number: 3, title: "Listen to the message", detail: "Open Phone and listen to the new voicemail message.")
            }
            Text("Already checked this? You can confirm below. Keep Shield installed until both checks work.")
                .foregroundStyle(ForwardingStyle.secondaryText)
            DisclosureGroup("The check didn’t work") {
                Text("Stop here and contact Tello to restore normal call and voicemail routing. Keep Shield installed while you get help.")
                    .padding(.top, 8).foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

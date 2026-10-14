import SwiftUI

struct ForwardingTestView: View {
    let status: ForwardingStatus
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // The two checks read as one list; the test's status and end time as one note.
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                Label(status.ringTestAt == nil ? "Sound check still needed" : "You heard Shield", systemImage: status.ringTestAt == nil ? "circle" : "checkmark.circle.fill")
                Label(status.forwardingTestAt == nil ? "Call check still needed" : "A call reached Shield", systemImage: status.forwardingTestAt == nil ? "circle" : "checkmark.circle.fill")
            }
            Text("Your phone stays connected to Shield when you tap Done.")
            VStack(alignment: .leading, spacing: 4) {
                Text(status.alwaysOn == true && status.liveScreening == true ? "Call checks stay on after this test. Quiet hours and daily limits still apply." : status.active && status.liveScreening == true ? "Call checks are on for this short test." : "Call checks are off. Calls that reach Shield may go to voicemail.")
                if status.active, let until = status.expiresAt {
                    Text("This test ends at \(until.formatted(date: .omitted, time: .shortened)).")
                }
            }
            .foregroundStyle(ForwardingStyle.secondaryText)
            ShieldDisclosure("How do I disconnect later?") {
                Text("Choose Disconnect Shield in Setup options. Keep the app until ordinary calls and voicemail work.")
            }
            ShieldDisclosure("Other calls to check") {
                Text("Ask a helper to call from a number you haven’t saved. Answer Shield’s call and press 1. Check that you can hear each other.")
                Text("Next, try voicemail and a call from a saved contact. Calls while you’re busy or have no signal still need checking.")
            }
        }
    }
    private func eventLabel(_ kind: String) -> String {
        switch kind {
        case "accepted": "Shield received press 1"
        case "voicemail_received": "A voicemail was received"
        case "call_ended": "The latest call ended"
        case "callback_offered": "Shield is offering a call"
        default: "A call reached Shield"
        }
    }
}

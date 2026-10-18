import SwiftUI

struct ForwardingTestView: View {
    let status: ForwardingStatus
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                Label(status.ringTestAt == nil ? "Sound check still needed" : "You heard Shield", systemImage: status.ringTestAt == nil ? "circle" : "checkmark.circle.fill")
                Label(status.forwardingTestAt == nil ? "Call check still needed" : "A call reached Shield", systemImage: status.forwardingTestAt == nil ? "circle" : "checkmark.circle.fill")
            }
            if status.liveScreening != true {
                Text("Call checks are off. Calls that reach Shield may go to voicemail.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
            }
            ShieldDisclosure("How do I disconnect later?") {
                Text("Choose Disconnect Shield in Setup options. Keep the app until ordinary calls and voicemail work.")
            }
            ShieldDisclosure("Other calls to check") {
                Text("Ask a helper to call from a number you haven’t saved. Answer Shield’s call and press 1. Check that you can hear each other.")
                Text("Next, try voicemail and a call from a saved contact. Calls while you’re busy or have no signal still need checking.")
            }
        }
    }
}

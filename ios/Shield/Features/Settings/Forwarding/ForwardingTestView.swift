import SwiftUI

struct ForwardingTestView: View {
    let status: ForwardingStatus
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Label(status.ringTestAt == nil ? "Sound check still needed" : "Sound check received", systemImage: status.ringTestAt == nil ? "circle" : "checkmark.circle.fill")
            Label(status.forwardingTestAt == nil ? "Forwarding check still needed" : "A forwarded call reached Shield", systemImage: status.forwardingTestAt == nil ? "circle" : "checkmark.circle.fill")
            Text("Next: a conversation with someone you know").font(.title2.bold())
            Text("Have them call your mobile from an unknown number. They’ll say their name and why they’re calling. Answer the Shield callback and press 1.")
            Text("Check that you can hear each other. Then try declining a call and playing its voicemail. A saved contact should still ring normally.").foregroundStyle(ForwardingStyle.secondaryText)
            Text("Busy and no-signal routing also need testing. These initial checks do not enable always-on protection.").foregroundStyle(ForwardingStyle.secondaryText)
            if let latest = status.latestEvents.last {
                Label(eventLabel(latest.kind), systemImage: "waveform")
                Text("Call activity updates automatically.").font(.subheadline).foregroundStyle(ForwardingStyle.secondaryText)
            }
            Text("Finish this test with the restoration steps below.").foregroundStyle(ForwardingStyle.secondaryText)
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

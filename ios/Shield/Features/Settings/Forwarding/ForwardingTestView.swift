import SwiftUI

struct ForwardingTestView: View {
    let status: ForwardingStatus
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Label(status.ringTestAt == nil ? "Sound check still needed" : "Sound check received", systemImage: status.ringTestAt == nil ? "circle" : "checkmark.circle.fill")
            Label(status.forwardingTestAt == nil ? "Forwarding check still needed" : "A forwarded call reached Shield", systemImage: status.forwardingTestAt == nil ? "circle" : "checkmark.circle.fill")
            Text("Your forwarding stays connected when you tap Done.").font(.title3)
            Text("To disconnect Shield later, choose Restore my phone in Setup options.")
                .foregroundStyle(ForwardingStyle.secondaryText)
            Label(status.active ? "Screening test is active" : "Screening test is paused", systemImage: status.active ? "waveform" : "pause.circle")
            Text(status.active ? "Screening runs during the current 30-minute test session. These checks don’t enable always-on protection." : "Forwarding remains connected. Outside a screening session, forwarded callers can leave a message with Shield.")
                .foregroundStyle(ForwardingStyle.secondaryText)
            DisclosureGroup("More call checks you can do later") {
                VStack(alignment: .leading, spacing: 16) {
                    Text("During a screening session, have someone you know call your mobile from an unknown number. Answer the Shield callback and press 1. Check that you can hear each other.")
                    Text("Then try declining a call and playing its voicemail. A saved contact should still ring normally. Busy and no-signal routing also need testing.")
                }.padding(.top, 8).foregroundStyle(ForwardingStyle.secondaryText)
            }
            if let latest = status.latestEvents.last {
                Label(eventLabel(latest.kind), systemImage: "waveform")
                Text("Call activity updates automatically.").font(.subheadline).foregroundStyle(ForwardingStyle.secondaryText)
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

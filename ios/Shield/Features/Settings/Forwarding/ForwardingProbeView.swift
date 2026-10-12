import SwiftUI

struct ForwardingProbeView: View {
    let model: ForwardingSetupModel
    private var ring: Bool { model.step == .ring }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if model.probePassed {
                Label(ring ? "You heard Shield" : "A call reached Shield", systemImage: "checkmark.circle.fill")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.connected)
                    .accessibilityIdentifier("forwarding-probe-passed")
                Text(ring ? "You pressed 1. Now we’ll finish connecting your phone." : "The test call reached Shield. Your result is saved.")
                if !ring { Text("Calls while you’re busy or have no signal still need checking.").foregroundStyle(ForwardingStyle.secondaryText) }
            } else if model.probeWaiting {
                Label(ring ? "Answer the Shield call" : "Let your phone ring", systemImage: "phone.arrow.down.left")
                    .font(.title2.bold())
                Text(ring ? "Tap the green answer button. Open Keypad and press 1 when Shield asks." : "Don’t answer or decline. Leave this call ringing.")
                Text("Wait here for the result. It can take 90 seconds.").foregroundStyle(ForwardingStyle.secondaryText)
            } else if model.probe != nil {
                Label("This check didn’t finish", systemImage: "exclamationmark.circle")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.held)
                Text(ring ? "Turn Focus off. Check your signal. Answer the next call and press 1." : "Check Live Voicemail is off and Tello accepted your codes. Let the next call ring.")
                Text("Your place is saved. Your phone may still be connected to Shield.").foregroundStyle(ForwardingStyle.secondaryText)
            } else {
                Image(systemName: ring ? "phone.badge.waveform" : "phone.arrow.right")
                    .font(.largeTitle).imageScale(.large).foregroundStyle(ShieldTheme.action).accessibilityHidden(true)
                Text(ring ? "Shield will call you. Answer, listen, and press 1." : "Shield will call your number. Don’t answer. We’ll check where the call goes.")
                    .font(.title3)
                Text(ring ? "This checks the sound. Your settings won’t change." : "Answered by mistake? Hang up and try again.")
                    .foregroundStyle(ForwardingStyle.secondaryText)
            }
            if let status = model.status, status.active, let end = status.expiresAt {
                Text("Call test ends at \(end.formatted(date: .omitted, time: .shortened)).")
                    .font(.subheadline).foregroundStyle(ForwardingStyle.secondaryText)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .contain)
    }
}

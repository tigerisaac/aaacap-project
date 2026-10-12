import SwiftUI

struct ForwardingProbeView: View {
    let model: ForwardingSetupModel
    private var ring: Bool { model.step == .ring }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if model.probePassed {
                Label(ring ? "You heard Shield" : "A forwarded call reached Shield", systemImage: "checkmark.circle.fill")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.connected)
                    .accessibilityIdentifier("forwarding-probe-passed")
                Text(ring ? "Your keypad response was received. Next, connect your phone settings." : "Shield received the check sent through your mobile number. The result is saved.")
                if !ring { Text("Busy calls, no-signal calls and voicemail still need their own checks.").foregroundStyle(ForwardingStyle.secondaryText) }
            } else if model.probeWaiting {
                Label(ring ? "Answer the Shield call" : "Let your phone ring", systemImage: "phone.arrow.down.left")
                    .font(.title2.bold())
                Text(ring ? "Tap the green answer button. Open Keypad and press 1 when Shield asks." : "Don’t answer or decline this call. Shield will check where it goes when you leave it ringing.")
                Text("The result appears here automatically. This can take up to 90 seconds.").foregroundStyle(ForwardingStyle.secondaryText)
            } else if model.probe != nil {
                Label("This check didn’t finish", systemImage: "exclamationmark.circle")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.held)
                Text(ring ? "Keep your phone nearby with Focus off and a mobile signal. Answer the next call and press 1." : "Check that Live Voicemail is off and Tello accepted the forwarding codes. Then let the next call ring without answering.")
                Text("Your place is saved. A failed check does not mean forwarding is off.").foregroundStyle(ForwardingStyle.secondaryText)
            } else {
                Image(systemName: ring ? "phone.badge.waveform" : "phone.arrow.right")
                    .font(.largeTitle).imageScale(.large).foregroundStyle(ShieldTheme.action).accessibilityHidden(true)
                Text(ring ? "Shield will call you. Answer, listen, and press 1." : "Shield will call your mobile number. Leave the call ringing. We’ll check that it reaches Shield.")
                    .font(.title3)
                Text(ring ? "This is a short sound check. It won’t change your phone settings." : "If you accidentally answer, you may hear a few tones. Hang up and retry the check.")
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

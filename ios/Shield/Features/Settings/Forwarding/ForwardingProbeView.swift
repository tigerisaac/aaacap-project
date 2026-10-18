import SwiftUI

struct ForwardingProbeView: View {
    let model: ForwardingSetupModel
    @Environment(\.dynamicTypeSize) private var typeSize
    private var ring: Bool { model.step == .ring }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if model.probePassed {
                Label(ring ? "You heard Shield" : "A call reached Shield", systemImage: "checkmark.circle.fill")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.connected)
                    .accessibilityIdentifier("forwarding-probe-passed")
                if ring { Text("Now we’ll finish connecting your phone.") }
            } else if model.probeWaiting {
                Label(ring ? "Answer the Shield call" : "Let your phone ring", systemImage: "phone.arrow.down.left")
                    .font(.title2.bold())
                if ring {
                    Text("Answer, open Keypad, and press 1.").font(.title2)
                } else {
                    dontAnswer
                }
                Text("Wait here for the result. It can take 90 seconds.").foregroundStyle(ForwardingStyle.secondaryText)
            } else if model.probe != nil {
                Label("This check didn’t finish", systemImage: "exclamationmark.circle")
                    .font(.title2.bold()).foregroundStyle(ShieldTheme.held)
                Text(ring ? "Turn Focus off. Check your signal. Answer the next call and press 1." : "Check Live Voicemail is off and \(model.carrier) accepted your codes. Let the next call ring.")
                Text("Your place is saved. Your phone may still be connected to Shield.").foregroundStyle(ForwardingStyle.secondaryText)
            } else {
                HStack(alignment: .top, spacing: ShieldTheme.Spacing.content) {
                    if !typeSize.isAccessibilitySize {
                        Image(systemName: ring ? "phone.badge.waveform" : "phone.arrow.right")
                            .font(.title2.weight(.semibold)).foregroundStyle(ShieldTheme.action)
                            .frame(width: 56, height: 56)
                            .background(ShieldTheme.action.opacity(0.10), in: .rect(cornerRadius: 14))
                            .accessibilityHidden(true)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Shield will call you.").font(.title2.weight(.semibold))
                        if ring { Text("Answer, listen, and press 1.").font(.title3).foregroundStyle(ForwardingStyle.secondaryText) }
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityElement(children: .combine)
                }
                if !ring { dontAnswer }
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .contain)
    }

    private var dontAnswer: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Don’t answer").font(.title2.bold()).foregroundStyle(ShieldTheme.held)
            Text("Let it ring. Don’t decline the call.").foregroundStyle(ForwardingStyle.secondaryText)
        }
        .accessibilityElement(children: .combine)
    }
}

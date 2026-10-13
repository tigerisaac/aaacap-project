#if DEBUG && targetEnvironment(simulator)
import Foundation

enum PreviewSetupStatus {
    static func make(trial: Bool) -> SetupStatus {
        SetupStatus(participantId: DemoData.participant.id, name: "Pat", phone: "+12025550100", shieldNumber: "+15074731802",
            status: "active", isOwner: true, consentVersion: "sample", consented: true, phoneVerified: true,
            lastTestAt: .now, restoredAt: nil, routingTestUntil: nil, liveServiceEnabled: true,
            carrierProfile: .init(id: "sample", name: "Sample carrier", configuration: "Use these instructions with your helper.",
                validatedAt: .now, activationSteps: ["Follow the guided phone setup."], restorationSteps: ["Check ordinary calls and voicemail with your helper."]),
            supportEmail: nil, isTrial: trial, trial: trial ? .init(active: true, expiresAt: .now.addingTimeInterval(1_800), remainingCalls: 10) : nil)
    }
}
#endif

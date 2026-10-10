#if DEBUG
import Foundation

extension ForwardingStatus {
    static var uiTestFixture: Self {
        Self(participantId: UUID(uuidString: "b0b7af93-72ad-431d-9708-f1d9564a2b36")!, carrier: "Tello",
             phone: "+12025550101", shieldNumber: "+12025550100", voiceProvider: "Telnyx", prepared: true, active: true,
             expiresAt: Date.now.addingTimeInterval(1800), remainingCalls: 10, consentVersion: "ui-test",
             consented: false, phoneVerified: true, stage: "overview", restorationRequested: false, lastTestAt: nil,
             activationCodes: ["**61*12025550100#", "**67*12025550100#", "**62*12025550100#"],
             restorationSteps: ["Enter the saved restoration codes in Phone.", "Check ordinary calls and carrier voicemail."],
             readiness: "Demo call-test window. No phone settings are changed.", latestEvents: [])
    }
}
#endif

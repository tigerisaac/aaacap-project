import Foundation

enum VoicemailPreview {
    /// Authored sample content, never inferred from a live caller or used as a real summary.
    static func summary(for call: CallRecord) -> String {
        if let summary = call.voicemail?.summary { return summary }
        return call.reasonCode == "known_missed"
            ? "A reminder about an appointment on Thursday at 10 a.m."
            : "A caller asks you to get in touch. Check who they are before calling back."
    }

    static func message(for call: CallRecord) -> String {
        if call.voicemail?.isNotice == true {
            return "This is an automated account alert. We noticed unusual activity on your card. Please check your banking app or contact us using the number on the back of your card."
        }
        return call.reasonCode == "known_missed"
            ? "Hello Pat. This is a reminder about your appointment on Thursday at ten in the morning. Please bring your usual paperwork. Thank you."
            : "Hello. I’m calling for Pat. Please get in touch when you have a moment. Thank you."
    }
}

import Foundation

enum PrivacyCopy {
    static let screeningProviders = "Telnyx carries and temporarily records incoming calls from when Shield answers. Soniox transcribes the caller’s speech. OpenAI checks the words and may receive audio to ask questions."
    static let messageRetention = "Open Shield within 24 hours to save new recordings on this iPhone. The cloud audio copy is deleted after verified delivery or becomes unavailable within 24 hours; scheduled cleanup removes expired copies and can be delayed. Saved recordings stay on this iPhone until you delete them, delete your account from this phone or remove the app. Call history and cloud summaries expire after 30 days."
    static let screeningConsent = "I agree to send forwarded calls to Telnyx, Soniox and OpenAI for screening and message processing."
    static let monitoringProviders = "Telnyx uses Soniox to turn both people’s speech into words. OpenAI checks those words while you talk. The caller hears a notice before your phone rings."
    static let providerRetention = "Providers may retain service and security records under their own policies."
}

import Foundation

struct CallEvent: Codable, Identifiable, Hashable, Sendable {
    let kind: String
    let at: Date
    var id: String { kind }
    var label: String {
        switch kind {
        case "received": "Call reached Shield"
        case "screening_started": "Introduction requested"
        case "live_screening_started": "Live screening started"
        case "call_stopped": "Call ended by Shield"
        case "screening_finished": "Screening finished"
        case "offered", "callback_offered": "Call offered"
        case "private_prompt", "private_summary_played": "Private summary played"
        case "accepted": "Accepted with the keypad"
        case "not_accepted": "Not accepted"
        case "not_connected": "Not connected"
        case "voicemail_offered": "Voicemail offered"
        case "message_received", "voicemail_received": "Message received"
        case "ended", "call_ended": "Call ended"
        case "blocked_caller_ended": "Blocked number ended"
        case "monitoring_disclosed": "Caller told about transcription"
        case "monitor_intervened": "Ended by Shield with a warning"
        case "voicemail_removed": "Message removed by Shield"
        case "voicemail_restored": "Message restored"
        default: "Call updated"
        }
    }
}

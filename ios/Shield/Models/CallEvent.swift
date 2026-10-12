import Foundation

struct CallEvent: Codable, Identifiable, Hashable, Sendable {
    let kind: String
    let at: Date
    var id: String { kind }
    var label: String {
        switch kind {
        case "received": "Call reached Shield"
        case "screening_started": "Shield asked about the call"
        case "live_screening_started": "Shield started checking the call"
        case "call_stopped": "Call ended by Shield"
        case "screening_finished": "Call check finished"
        case "offered", "callback_offered": "Your phone rang"
        case "private_prompt", "private_summary_played": "You heard what the call was about"
        case "accepted": "You pressed 1 to answer"
        case "not_accepted": "You didn’t take the call"
        case "not_connected": "The call didn’t connect"
        case "voicemail_offered": "The caller could leave a message"
        case "message_received", "voicemail_received": "Message received"
        case "ended", "call_ended": "Call ended"
        case "blocked_caller_ended": "A blocked call was stopped"
        case "monitoring_disclosed": "The caller was told about word checks"
        case "monitor_intervened": "Ended by Shield with a warning"
        case "voicemail_removed": "Message removed by Shield"
        case "voicemail_restored": "Message brought back"
        default: "Call updated"
        }
    }
}

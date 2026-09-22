import SwiftUI

enum ShieldTheme {
    static let action = Color("Action")
    static let held = Color("Held")
    static let connected = Color("Connected")
    static let message = Color("Message")
    static let surface = Color("Surface")

    static func color(for outcome: CallOutcome) -> Color {
        switch outcome {
        case .held, .verification: held
        case .connected: connected
        case .voicemail: message
        case .missed: .secondary
        case .screening, .offered: action
        }
    }
}

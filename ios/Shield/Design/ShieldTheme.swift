import SwiftUI

enum ShieldTheme {
    static let action = Color("Action")
    static let held = Color("Held")
    static let connected = Color("Connected")
    static let message = Color("Message")
    static let surface = Color("Surface")
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    static let actionInk = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(red: 0.08, green: 0.12, blue: 0.22, alpha: 1) : .white
    })

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

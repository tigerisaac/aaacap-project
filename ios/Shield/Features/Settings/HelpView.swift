import SwiftUI

struct HelpView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        List {
            Section {
                Text("If a call or message worries you, stop the conversation before taking action.")
            }
            Section("A good next step") {
                Label("Call a number you already trust", systemImage: "phone")
                Text("Use your card, statement, or official app. Don’t use contact details supplied by the caller.")
                    .font(.subheadline).foregroundStyle(.secondary)
                if model.isOwner { NavigationLink("Your saved numbers", value: AppRoute.savedNumbers) }
                Label("Talk to someone you know", systemImage: "person.2")
                Text("A familiar voice or number alone doesn’t prove identity.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Section("If you already acted") {
                Text("Contact the relevant bank, account provider, or device support through an independent channel as soon as possible.")
                Link("FTC recovery guidance", destination: URL(string: "https://consumer.ftc.gov/articles/what-do-if-you-were-scammed")!)
                Link("Report to the FTC", destination: URL(string: "https://reportfraud.ftc.gov/")!)
            }
            Section("Shield support") {
                if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                    Link("Contact pilot support", destination: url)
                } else {
                    Text("Contact the person who helped set up your phone.")
                }
                Text("Shield is not an emergency service. Support and caregiver alerts are not continuously monitored.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Get help")
        .navigationBarTitleDisplayMode(.inline)
    }
}

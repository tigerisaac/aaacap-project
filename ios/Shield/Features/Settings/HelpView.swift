import SwiftUI

struct HelpView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        List {
            ShieldGroup { Text("If a call worries you, hang up. You can check it later.").font(ShieldTheme.Typography.title).foregroundStyle(ShieldTheme.ink).fixedSize(horizontal: false, vertical: true).padding(.vertical, 8) }
            ShieldGroup {
                DisclosureGroup("How can I check a caller?") {
                    Text("Call a number from your card, bill, or an app you already use. Don’t use a number the caller gave you.")
                    if model.isOwner { NavigationLink("Numbers you trust", value: AppRoute.savedNumbers) }
                    Text("A familiar voice or number can be faked.").foregroundStyle(ShieldTheme.secondaryText)
                }
                DisclosureGroup("I sent money or private information") {
                    Text("Call your bank or the company involved using a number you already know.")
                    Link("What to do next", destination: URL(string: "https://consumer.ftc.gov/articles/what-do-if-you-were-scammed")!)
                    Link("Report a scam", destination: URL(string: "https://reportfraud.ftc.gov/")!)
                }
            }
            ShieldGroup {
                if model.isOwner { NavigationLink("Help with my phone", value: AppRoute.setup) }
                if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                    Link("Ask for help with Shield", destination: url)
                } else { Text("Need a hand? Ask the person who helped set up your phone.") }
                DisclosureGroup("In an emergency") {
                    Text("Use your usual emergency number. Shield and helper alerts aren’t watched all the time.")
                }
            }
        }
        .shieldListStyle()
        .navigationTitle("Get help").navigationBarTitleDisplayMode(.inline)
    }
}

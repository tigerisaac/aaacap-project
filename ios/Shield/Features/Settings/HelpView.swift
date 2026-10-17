import SwiftUI

struct HelpView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        List {
            ShieldPageHeader {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                    Text("If a call worries you, hang up.").shieldPageHeading().accessibilityAddTraits(.isHeader)
                    Text("You can check it later.").foregroundStyle(ShieldTheme.secondaryText)
                }.padding(.vertical, ShieldTheme.Spacing.tight)
            }
            ShieldGroup {
                ShieldDisclosure("How can I check a caller?") {
                    Text("Call a number from your card, bill, or an app you already use. Don’t use a number the caller gave you.")
                    if model.isOwner { NavigationLink("Numbers you trust", value: AppRoute.savedNumbers) }
                    Text("A familiar voice or number can be faked.").foregroundStyle(ShieldTheme.secondaryText)
                }
                ShieldDisclosure("I sent money or private information") {
                    Text("Call your bank or the company involved using a number you already know.")
                    resourceLink("What to do next", url: "https://consumer.ftc.gov/articles/what-do-if-you-were-scammed")
                    resourceLink("Report a scam", url: "https://reportfraud.ftc.gov/")
                }
            }
            ShieldGroup {
                if model.isOwner { NavigationLink("Help with my phone", value: AppRoute.forwardingSetup) }
                if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                    Link("Ask for help with Shield", destination: url)
                }
                ShieldDisclosure("In an emergency") {
                    Text("Use your usual emergency number. Shield and helper alerts aren’t watched all the time.")
                }
            } footer: {
                if model.service?.supportEmail == nil { Text("Need a hand? Ask the person who helped set up your phone.") }
            }
        }
        .shieldListStyle()
        .contentMargins(.top, 0, for: .scrollContent)
        .navigationTitle("Get help").navigationBarTitleDisplayMode(.inline)
    }

    private func resourceLink(_ title: String, url: String) -> some View {
        Link(destination: URL(string: url)!) {
            Text(title).font(.body.weight(.medium))
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                .contentShape(.rect)
        }
        // A disclosure's links must not take over its containing List row.
        .buttonStyle(.borderless)
        .accessibilityHint("Opens in your browser")
    }
}

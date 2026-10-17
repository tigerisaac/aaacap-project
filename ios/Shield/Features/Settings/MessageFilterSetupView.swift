import SwiftUI

struct MessageFilterSetupView: View {
    // The unfinished extension is deliberately not embedded. A remote flag alone
    // must never offer setup for a feature this app version does not contain.
    var body: some View {
        List {
            ShieldGroup {
                Text("Automatic text checks aren’t ready yet.")
                NavigationLink("Check a text yourself", value: AppRoute.check)
            }
            ShieldGroup {
                ShieldDisclosure("What will Shield see?") {
                    Text("This version does not filter your messages or read your inbox. Use Check a text to send a text you choose to Shield and OpenAI for a scam check.")
                    Text("Checks can be wrong. Confirm important requests with the sender using a number you already know.")
                }
            }
        }
        .shieldListStyle()
        .navigationTitle("Automatic text checks").navigationBarTitleDisplayMode(.inline)
    }
}

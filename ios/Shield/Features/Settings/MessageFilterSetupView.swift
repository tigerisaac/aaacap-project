import SwiftUI

struct MessageFilterSetupView: View {
    @Environment(AppState.self) private var model
    private var available: Bool { model.service?.messageFilteringAvailable == true && !model.isDemo }

    var body: some View {
        List {
            ShieldGroup {
                Text(available ? "Shield can check some texts from people you don’t know." : "Automatic text checks aren’t ready yet.")
                NavigationLink("Check a text yourself", value: AppRoute.check)
            }
            if available {
                ShieldSection("Turn on in Messages") {
                    Text("1. Open Messages, then Filters.")
                    Text("2. Tap Manage Filtering.")
                    Text("3. Under Text Message Filter, choose Shield.")
                }
            }
            ShieldGroup {
                ShieldDisclosure("What will Shield see?") {
                    Text("Some texts from unknown senders go to Shield and OpenAI for a scam check. Shield can’t see your whole inbox or iMessage conversations.")
                    Text("Checks can be wrong. Look in Messages for anything that was moved. Turn Shield off in the same settings any time.")
                    Link("Apple’s instructions", destination: URL(string: "https://support.apple.com/guide/iphone/iph203ab0be4/ios")!)
                }
            }
        }
        .shieldListStyle()
        .navigationTitle("Automatic text checks").navigationBarTitleDisplayMode(.inline)
    }
}

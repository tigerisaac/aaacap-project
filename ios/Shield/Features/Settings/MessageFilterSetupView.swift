import SwiftUI

struct MessageFilterSetupView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        List {
            Section {
                Label(model.service?.messageFilteringAvailable == true ? "Available on this service" : "Not enabled for this pilot",
                      systemImage: "line.3.horizontal.decrease.circle.fill")
                    .font(.headline).foregroundStyle(ShieldTheme.message)
                Text("Shield can check eligible messages from unknown senders. It cannot see your full inbox or iMessage conversations.")
            }
            if model.service?.messageFilteringAvailable == true, !model.isDemo {
                Section("Turn it on in Messages") {
                    Label("Open Messages → Filters", systemImage: "1.circle")
                    Label("Choose Manage Filtering", systemImage: "2.circle")
                    Label("Open Text Message Filter and select Shield", systemImage: "3.circle")
                }
                Section("Before you enable it") {
                    Text("Eligible message text is sent to Shield and OpenAI for analysis. Automatic checks can miss scams or misfile useful messages.")
                    Text("Review filtered messages in Messages. You can disable Shield in the same settings anytime.")
                }
            }
            Section {
                Link("Apple’s filtering guide", destination: URL(string: "https://support.apple.com/guide/iphone/iph203ab0be4/ios")!)
                Text("Use Check to review a message or screenshot yourself.").foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Message filtering")
        .navigationBarTitleDisplayMode(.inline)
    }
}

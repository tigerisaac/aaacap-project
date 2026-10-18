import SwiftUI

struct CallDirectoryStatusView: View {
    let directory: CallDirectoryCoordinator
    let phoneBlocking: Bool?

    var body: some View {
        if let phoneBlocking {
            ShieldGroup {
                LabeledContent("Block on this iPhone", value: phoneBlocking ? "On" : "Off")
                if !phoneBlocking {
                    Button("Turn on in Settings", systemImage: "gearshape") { Task { await CallDirectorySync.openSettings() } }
                }
            } footer: {
                Text(phoneBlocking
                     ? (directory.needsReload ? "Your iPhone’s blocked numbers need an update." : "Your iPhone blocks these numbers too.")
                     : "In Phone settings, open Call Blocking & Identification and turn on Shield.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
        }
        if let issue = directory.error {
            ShieldGroup {
                Text(issue)
                Button("Update iPhone list") { Task { await directory.refresh() } }
                    .disabled(directory.isReloading)
            }
        }
    }
}

import SwiftUI

struct CallProtectionExplanation: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Shield reads both people’s words on calls you answer through Shield.")
            Text(PrivacyCopy.monitoringProviders)
            Text("It may warn you and end a suspicious call. It can miss scams or end ordinary calls.")
                .foregroundStyle(ShieldTheme.secondaryText)
            ShieldDisclosure("What happens to my words?") {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Telnyx currently uses Soniox for transcription. No connected-call sound recording is saved. The temporary words are encrypted and deleted when the call ends, or within two hours. Provider security logs follow their separate policies.")
                    Link("Privacy details", destination: URL(string: "https://shield-calls-isaac.web.app/privacy")!)
                }.foregroundStyle(ShieldTheme.secondaryText).padding(.vertical, 8)
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

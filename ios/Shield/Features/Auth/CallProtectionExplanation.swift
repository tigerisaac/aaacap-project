import SwiftUI

struct CallProtectionExplanation: View {
    var includesConsentDetails = false

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
            Text("Shield reads both people’s words on calls you answer through Shield.")
            if includesConsentDetails { Text(PrivacyCopy.monitoringProviders) }
            Text("It may warn you and end a suspicious call.")
                .foregroundStyle(ShieldTheme.secondaryText)
            if includesConsentDetails {
                Text("It can miss scams or end ordinary calls.").foregroundStyle(ShieldTheme.secondaryText)
            }
            ShieldDisclosure("What happens to my words?") {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                    Text("Telnyx currently uses Soniox for transcription. No connected-call sound recording is saved. The temporary words are encrypted and deleted when the call ends. Any copy left behind expires after two hours and is removed by daily cleanup, subject to service availability. Provider security logs follow their separate policies.")
                    Link("Privacy details", destination: URL(string: "https://shield-calls-isaac.web.app/privacy")!)
                        // A link inside a Form row must not adopt the whole row
                        // as its target when the disclosure is collapsed.
                        .buttonStyle(.borderless)
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                }.foregroundStyle(ShieldTheme.secondaryText).padding(.vertical, ShieldTheme.Spacing.compact)
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

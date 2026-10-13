import SwiftUI

struct CallProtectionExplanation: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("On calls you answer through Shield, it checks the words for scam requests.")
            Text("It may warn you and end a suspicious call. Checks can miss a scam or stop an ordinary call.")
                .foregroundStyle(ShieldTheme.secondaryText)
            DisclosureGroup("What happens to my words?") {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Telnyx turns both people’s speech into words. OpenAI checks those words while you talk. The caller is told before your phone rings.")
                    Text("No sound recording is saved. The words are deleted when the call ends.")
                    Link("Privacy details", destination: URL(string: "https://shield-calls-isaac.web.app/privacy")!)
                }.foregroundStyle(ShieldTheme.secondaryText).padding(.vertical, 8)
            }
        }.fixedSize(horizontal: false, vertical: true)
    }
}

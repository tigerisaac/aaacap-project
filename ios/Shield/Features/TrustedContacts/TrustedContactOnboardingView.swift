import SwiftUI

struct TrustedContactOnboardingView: View {
    @Environment(AppState.self) private var model
    let participantID: UUID
    @State private var added: TrustedContact?
    @State private var working = false
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                Text(added == nil ? "Would you like someone to help?" : "Waiting for confirmation")
                    .shieldPageHeading().accessibilityAddTraits(.isHeader)
                if let added {
                    Text("\(added.name) can choose whether to receive alerts and how to get them.")
                    if added.requestDelivery != "submitted" {
                        ShieldNotice(title: "Your contact is saved", detail: "We couldn’t confirm the request text was sent. They can open Shield and sign in with their number to review it.", symbol: "info.circle")
                    }
                    Text("They won’t receive protection alerts until they accept. You can manage trusted contacts in Family & friends.")
                        .foregroundStyle(ShieldTheme.secondaryText)
                    Button { Task { await finish(enabled: true) } } label: { ShieldActionLabel(title: "Continue", isWorking: working) }
                        .shieldPrimaryButton().disabled(working).accessibilityIdentifier("trusted-contact-finish")
                } else {
                    Text("If you’d like, Shield can alert someone you trust when it stops a suspicious call or protection needs attention.")
                    Text("You can also use Shield on your own. It’s your choice, and you can change it later.")
                        .foregroundStyle(ShieldTheme.secondaryText)
                    NavigationLink { AddTrustedContactView(participantID: participantID) { added = $0 } } label: {
                        Label("Add a trusted contact", systemImage: "person.badge.plus").frame(maxWidth: .infinity, alignment: .leading).padding(20)
                    }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                        .background(ShieldTheme.card, in: .rect(cornerRadius: 16)).accessibilityIdentifier("trusted-contact-yes").disabled(working)
                    Button { Task { await finish(enabled: false) } } label: {
                        Label(working ? "Saving…" : "Continue without one", systemImage: "person").frame(maxWidth: .infinity, alignment: .leading).padding(20)
                    }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                        .background(ShieldTheme.card, in: .rect(cornerRadius: 16)).accessibilityIdentifier("trusted-contact-no").disabled(working)
                }
                if let error { ShieldNotice(title: "Couldn’t save your choice", detail: error, symbol: "exclamationmark.circle") }
            }.padding(ShieldTheme.Spacing.page)
                .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
        }.background(ShieldTheme.surface).shieldNavigationSurface()
            .navigationTitle("Your choice").navigationBarTitleDisplayMode(.inline)
    }
    private func finish(enabled: Bool) async {
        working = true; error = nil
        defer { working = false }
        do { try await model.completeTrustedContacts(enabled: enabled, participantID: participantID) }
        catch { self.error = error.localizedDescription }
    }
}

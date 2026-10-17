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
                ShieldWelcomeHeader(title: added == nil ? "Would you like someone to help?" : "Waiting for confirmation",
                                    symbol: added == nil ? "person.2.fill" : "hourglass")
                if let added {
                    Text("\(added.name) gets alerts only after accepting, and chooses how to get them.")
                    if added.requestDelivery != "submitted" {
                        ShieldNotice(title: "Your contact is saved", detail: "We couldn’t confirm the request text was sent. They can open Shield and sign in with their number to review it.", symbol: "info.circle")
                    }
                    Text("You can change this in Settings → Caretakers.")
                        .foregroundStyle(ShieldTheme.secondaryText)
                    Button { Task { await finish(enabled: true) } } label: { ShieldActionLabel(title: "Continue", isWorking: working) }
                        .shieldPrimaryButton().disabled(working).accessibilityIdentifier("trusted-contact-finish")
                } else {
                    Text("Shield can alert a caretaker if checks while you talk detect a possible scam request and intervene. Those checks must be on.")
                    VStack(spacing: ShieldTheme.Spacing.regular) {
                        NavigationLink { AddTrustedContactView(participantID: participantID) { added = $0 } } label: {
                            ChoiceCard(title: "Add a caretaker", detail: "Your calls and messages stay private.", symbol: "person.badge.plus")
                        }.buttonStyle(.plain).accessibilityIdentifier("trusted-contact-yes").disabled(working)
                        Button { Task { await finish(enabled: false) } } label: {
                            ChoiceCard(title: working ? "Saving…" : "Continue without one", detail: "You can add someone later.", symbol: "person")
                        }.buttonStyle(.plain).accessibilityIdentifier("trusted-contact-no").disabled(working)
                    }
                }
                if let error { ShieldNotice(title: "Couldn’t save your choice", detail: error, symbol: "exclamationmark.circle") }
            }.shieldWelcomeMargins().padding(.vertical, ShieldTheme.Spacing.card)
                .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
        }.background(ShieldTheme.welcomePage)
            .navigationTitle("Your choice").navigationBarTitleDisplayMode(.inline)
    }
    /// One of two equal choices: the shared row symbol and text, on its own card.
    private struct ChoiceCard: View {
        let title: String
        let detail: String
        let symbol: String
        var body: some View {
            HStack(spacing: ShieldTheme.Spacing.regular) {
                ActionRow(title: title, detail: detail, symbol: symbol)
                Image(systemName: "chevron.forward").font(.subheadline.weight(.semibold))
                    .foregroundStyle(.tertiary).accessibilityHidden(true)
            }
            .padding(.horizontal, ShieldTheme.Spacing.content).padding(.vertical, ShieldTheme.Spacing.regular)
            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
            .background(ShieldTheme.welcomeElement, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
            .contentShape(.rect)
        }
    }

    private func finish(enabled: Bool) async {
        working = true; error = nil
        defer { working = false }
        do { try await model.completeTrustedContacts(enabled: enabled, participantID: participantID) }
        catch { self.error = error.localizedDescription }
    }
}

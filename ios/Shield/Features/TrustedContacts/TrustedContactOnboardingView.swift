import SwiftUI

struct TrustedContactOnboardingView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    let participantID: UUID
    @State private var added: TrustedContact?
    @State private var working = false
    @State private var error: String?
    @State private var submittedChoice: Bool?
    @State private var choiceUnconfirmed = false
    @State private var retryAvailable = false
    @State private var checkingStatus = false
    @State private var feedbackRevision = 0
    @AccessibilityFocusState private var errorFocused: Bool
    private var canSave: Bool { !working && (!choiceUnconfirmed || retryAvailable) }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                    ShieldWelcomeHeader(title: added == nil ? "Would you like someone to help?" : "Waiting for confirmation",
                                        symbol: added == nil ? "person.2.fill" : "hourglass")
                    if let added {
                        Text("\(added.name) gets alerts only after accepting, and chooses how to get them.")
                        if added.requestDelivery != "submitted" {
                            ShieldNotice(title: "Your contact is saved", detail: model.service?.trustedContactTextsAvailable == false
                                ? "Share the invitation with them. They sign in with the mobile number you entered."
                                : "We couldn’t confirm the request text was sent. They can open Shield and sign in with their number to review it.", symbol: "info.circle")
                        }
                        if let url = model.service?.trustedContactsInvitationURL {
                            ShareLink(item: url, message: Text("Please review my caretaker request in Shield. Sign in with the mobile number I used for your invitation.")) {
                                Label("Share invitation", systemImage: "square.and.arrow.up").shieldWrappingLabel()
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
                            }.shieldSecondaryButton()
                        }
                        Text("You can change this in Settings → Caretakers.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                        if typeSize.isAccessibilitySize { finishButton }
                    } else {
                        Text("Shield can alert a caretaker if checks while you talk detect a possible scam request and intervene. Those checks must be on.")
                        VStack(spacing: ShieldTheme.Spacing.regular) {
                            NavigationLink { AddTrustedContactView(participantID: participantID,
                                textAvailable: model.service?.trustedContactTextsAvailable != false) { added = $0 } } label: {
                                ChoiceCard(title: "Add a caretaker", detail: "Your calls and messages stay private.", symbol: "person.badge.plus")
                            }.buttonStyle(.plain).accessibilityIdentifier("trusted-contact-yes").disabled(working || choiceUnconfirmed)
                            Button { Task { await finish(enabled: false) } } label: {
                                ChoiceCard(title: working && !checkingStatus ? "Saving…" : choiceUnconfirmed ? "Try saving again" : "Continue without one", detail: "You can add someone later.", symbol: "person")
                            }.buttonStyle(.plain).accessibilityIdentifier("trusted-contact-no").disabled(!canSave)
                        }
                    }
                    if let error {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                            ShieldNotice(title: "Choice not confirmed", detail: error, symbol: "exclamationmark.circle")
                                .accessibilityIdentifier("onboarding-choice-error").accessibilityFocused($errorFocused)
                            if choiceUnconfirmed {
                                Button { Task { await checkStatus() } } label: {
                                    Label(checkingStatus ? "Checking…" : "Check current status", systemImage: "arrow.clockwise")
                                        .shieldWrappingLabel().frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
                                }.shieldSecondaryButton().disabled(working)
                            }
                        }.id("onboarding-choice-error")
                    }
                }.shieldWelcomeMargins().padding(.vertical, ShieldTheme.Spacing.card)
                    .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }
            // Once a caretaker is added, Continue is the page's one action and pins to the bottom,
            // as on the other welcome pages; at accessibility sizes it scrolls inline instead.
            .safeAreaInset(edge: .bottom) {
                if added != nil, !typeSize.isAccessibilitySize {
                    finishButton.frame(maxWidth: ShieldTheme.Layout.readableWidth)
                        .padding(.horizontal, ShieldTheme.Spacing.card).shieldBottomTray(over: ShieldTheme.welcomePage)
                }
            }
            .background(ShieldTheme.welcomePage)
            .toolbar(.hidden, for: .navigationBar)
                .onChange(of: feedbackRevision) { _, _ in
                    proxy.scrollTo("onboarding-choice-error", anchor: .top)
                    errorFocused = true
                }
        }
    }
    private var finishButton: some View {
        Button { Task { await finish(enabled: true) } } label: { ShieldActionLabel(title: choiceUnconfirmed ? "Try saving again" : "Continue", isWorking: working && !checkingStatus) }
            .shieldPrimaryButton().disabled(!canSave).accessibilityIdentifier("trusted-contact-finish")
    }

    /// One of two equal choices: the shared row symbol and text on a grouped element, shaped
    /// like the toggle on the previous page.
    private struct ChoiceCard: View {
        let title: String
        let detail: String
        let symbol: String
        var body: some View {
            HStack(spacing: ShieldTheme.Spacing.regular) {
                ActionRow(title: title, detail: detail, symbol: symbol)
                Image(systemName: "chevron.right").font(.subheadline.weight(.semibold))
                    .foregroundStyle(.tertiary).accessibilityHidden(true)
            }
            .padding(.horizontal, ShieldTheme.Spacing.content).padding(.vertical, ShieldTheme.Spacing.compact)
            .background(ShieldTheme.welcomeElement, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
            .contentShape(.rect)
        }
    }

    private func finish(enabled: Bool) async {
        guard canSave else { return }
        let generation = model.sessionGeneration
        submittedChoice = enabled
        working = true; error = nil; retryAvailable = false
        defer { working = false }
        do { try await model.completeTrustedContacts(enabled: enabled, participantID: participantID) }
        catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            switch error {
            case APIError.service(_, let status) where (400..<500).contains(status): break
            default: choiceUnconfirmed = true
            }
            showFailure(error)
        }
    }

    private func checkStatus() async {
        guard choiceUnconfirmed, let submittedChoice, !working else { return }
        let generation = model.sessionGeneration
        working = true; checkingStatus = true; retryAvailable = false
        defer { working = false; checkingStatus = false }
        do {
            if try await model.confirmTrustedContacts(enabled: submittedChoice, participantID: participantID) { return }
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            retryAvailable = true
            error = "Your choice isn’t confirmed yet. You can try saving the same choice again."
            feedbackRevision += 1
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            showFailure(error)
        }
    }

    private func showFailure(_ failure: Error) {
        error = failure is URLError ? "Your connection was interrupted. Check your internet connection, then check the current status." : failure.localizedDescription
        feedbackRevision += 1
        model.handleSessionFailure(failure)
    }
}

import SwiftUI

struct SignInView: View {
    @Environment(AppState.self) private var model
    @Environment(\.colorSchemeContrast) private var contrast
    @State private var email = ""
    @State private var code = ""
    @State private var codeSent = false
    @State private var usesEmailLink = true
    @State private var working = false
    @State private var error: String?
    @FocusState private var focusedField: Field?
    private enum Field { case email, code }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    VStack(spacing: 18) {
                        Image("ShieldMark").resizable().scaledToFit()
                            .frame(width: 80, height: 80).clipShape(.rect(cornerRadius: 80 * ShieldTheme.Layout.iconCornerRatio, style: .continuous))
                            .accessibilityHidden(true)
                        Text("Shield").font(.largeTitle.weight(.bold))
                        Text("Screen unfamiliar calls and check messages.")
                            .font(.title3).multilineTextAlignment(.center)
                            .foregroundStyle(ShieldTheme.secondaryText)
                    }
                    .frame(maxWidth: .infinity).padding(.top, 16)

                    VStack(alignment: .leading, spacing: 20) {
                        if waitingForLink {
                            ScreenIntro(title: "Check your email", detail: "Open the link to sign in on this iPhone.", symbol: "envelope.badge")
                            Text(email).font(.headline).textSelection(.enabled)
                                .fixedSize(horizontal: false, vertical: true)
                            Text("No email? Check Junk or Spam, or send another link.")
                                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            ViewThatFits(in: .horizontal) {
                                HStack(spacing: 24) { emailActions }
                                VStack(alignment: .leading, spacing: 4) { emailActions }
                            }
                        } else {
                            if codeSent {
                                Text(usesEmailLink ? "Confirm the email used for this link." : "Enter the code we emailed you.")
                                    .font(.headline).accessibilityAddTraits(.isHeader)
                            }
                            Group {
                                if codeSent && !usesEmailLink {
                                    TextField("Verification code", text: $code, prompt: Text("Verification code").foregroundStyle(ShieldTheme.secondaryText))
                                        .textContentType(.oneTimeCode).keyboardType(.numberPad)
                                        .focused($focusedField, equals: .code)
                                        .accessibilityLabel("Email verification code")
                                } else {
                                    TextField("Email address", text: $email, prompt: Text("Email address").foregroundStyle(ShieldTheme.secondaryText))
                                        .textContentType(.emailAddress).keyboardType(.emailAddress)
                                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                                        .focused($focusedField, equals: .email).accessibilityLabel("Email address")
                                        #if DEBUG && targetEnvironment(simulator)
                                        .onChange(of: email) { _, value in
                                            if value == AppState.testAccountSequence { focusedField = nil; model.exploreTestAccount() }
                                        }
                                        #endif
                                }
                            }
                            .frame(minHeight: 44)
                            .padding(16).frame(minHeight: 56)
                            .background(ShieldTheme.card, in: .rect(cornerRadius: 14))
                            .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(focusedField == nil ? Color.primary.opacity(contrast == .increased ? 0.55 : 0.12) : ShieldTheme.action, lineWidth: focusedField == nil && contrast != .increased ? 1 : 2) }
                            .disabled(working).submitLabel(.continue)
                            .onSubmit { if canSubmit { Task { await submit() } } }
                            Button { Task { await submit() } } label: {
                                ShieldActionLabel(title: buttonTitle, isWorking: working)
                            }
                            .shieldPrimaryButton().disabled(!canSubmit)
                            if codeSent { changeEmailButton }
                            else {
                                Text(usesEmailLink ? "Shield emails you a link to sign in." : "Shield emails you a code to sign in.")
                                    .font(.footnote).foregroundStyle(ShieldTheme.secondaryText)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        if let error {
                            ShieldNotice(title: "Couldn’t sign in", detail: error, symbol: "exclamationmark.circle")
                                .accessibilityIdentifier("sign-in-error")
                        }
                        if model.configuration.baseURL == nil {
                            Text("Sign-in is unavailable. You can still explore the demo.")
                                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        }
                    }

                    if !codeSent {
                        Button("View demo") { model.exploreDemo() }
                            .frame(maxWidth: .infinity, minHeight: 44).disabled(working)
                        Text("After phone setup, calls are screened during test windows.")
                            .font(.footnote).foregroundStyle(ShieldTheme.secondaryText).multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(24)
                .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                Color.clear.frame(height: 1)
                    .background(ShieldTheme.surface.ignoresSafeArea(.container, edges: .top))
                    .accessibilityHidden(true)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(ShieldTheme.surface)
            .toolbar(.hidden, for: .navigationBar)
        }
        .task {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--uitesting-auth-loading") {
                email = "synthetic@example.com"
                working = true
                return
            }
            if ProcessInfo.processInfo.arguments.contains("--uitesting-auth-return"),
               let host = Bundle.main.object(forInfoDictionaryKey: "ShieldAuthHost") as? String,
               let url = URL(string: "https://\(host)/__/auth/action?mode=signIn&oobCode=SyntheticCodeForUIOnly") {
                await receiveLink(url)
                return
            }
            // Offline fixture for verifying the sent state without emailing anyone.
            if ProcessInfo.processInfo.arguments.contains("--uitesting-email-sent") {
                email = "beta@example.com"
                codeSent = true
                usesEmailLink = true
                return
            }
            #endif
            guard model.configuration.baseURL != nil else { return }
            if let service: ServiceConfiguration = try? await model.api.send("/public/config", authenticated: false) {
                usesEmailLink = service.signInMethod == "email-link"
            }
        }
        .onOpenURL { url in Task { await receiveLink(url) } }
    }

    private var waitingForLink: Bool { codeSent && usesEmailLink && code.isEmpty }

    @ViewBuilder
    private var emailActions: some View {
        Button { Task { await submit() } } label: {
            HStack(spacing: 8) {
                if working { ProgressView() }
                Text("Resend link")
            }
            .frame(minHeight: 44)
        }
        .disabled(!canSubmit)
        changeEmailButton
    }

    private var changeEmailButton: some View {
        Button("Change email") {
            codeSent = false
            code = ""
            error = nil
            focusedField = .email
        }
        .frame(minHeight: 44)
        .disabled(working)
    }

    private var canSubmit: Bool {
        !working && model.configuration.baseURL != nil &&
        (codeSent && !usesEmailLink ? code.count >= 6 : email.contains("@"))
    }

    private var buttonTitle: String {
        if usesEmailLink {
            if !code.isEmpty { return "Sign in" }
            return codeSent ? "Resend link" : "Continue"
        }
        return codeSent ? "Sign in" : "Continue"
    }

    private func receiveLink(_ url: URL) async {
        guard !working,
              let host = Bundle.main.object(forInfoDictionaryKey: "ShieldAuthHost") as? String,
              let receivedCode = EmailSignInLink.code(from: url, allowedHost: host) else { return }
        usesEmailLink = true
        codeSent = true
        code = receivedCode
        // Do not take an email address from the URL. A cold launch asks the user for it.
        if email.contains("@") { await submit() }
        else { focusedField = .email }
    }

    private func submit() async {
        working = true
        error = nil
        defer { working = false }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--uitesting-auth-error") {
            error = "Your connection was interrupted. Please try again."
            return
        }
        #endif
        do {
            if codeSent && (!usesEmailLink || !code.isEmpty) {
                try await model.api.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), code: code)
                focusedField = nil
                await model.didSignIn()
            } else {
                try await model.api.requestCode(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
                codeSent = true
                focusedField = usesEmailLink ? nil : .code
            }
        } catch { self.error = error.localizedDescription }
    }
}

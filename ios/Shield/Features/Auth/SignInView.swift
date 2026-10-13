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
    @AccessibilityFocusState private var statusFocused: Status?
    private enum Field { case email, code }
    private enum Status { case emailSent, error }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    VStack(spacing: ShieldTheme.Spacing.section) {
                        ShieldBrand(compact: true)
                        if !codeSent {
                            VStack(spacing: ShieldTheme.Spacing.regular) {
                                Text("Help with unfamiliar calls")
                                    .font(ShieldTheme.Typography.display).foregroundStyle(ShieldTheme.ink)
                                    .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                                Text("Shield asks why someone is calling. You choose whether to answer.")
                                    .font(.body).multilineTextAlignment(.center)
                                    .foregroundStyle(ShieldTheme.secondaryText)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity).padding(.top, 16)

                    VStack(alignment: .leading, spacing: 20) {
                        if waitingForLink {
                            Text("Check your email").shieldPageHeading()
                                .accessibilityAddTraits(.isHeader).accessibilityFocused($statusFocused, equals: .emailSent)
                            Text(email).font(.headline).textSelection(.enabled)
                                .fixedSize(horizontal: false, vertical: true)
                                .accessibilityLabel("Email sent to \(email)")
                                .accessibilityIdentifier("sign-in-address")
                            Text("Open your email app on this iPhone. Tap the sign-in link from Shield.")
                                .fixedSize(horizontal: false, vertical: true)
                            Text("No email? Check Junk or Spam.")
                                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            ViewThatFits(in: .horizontal) {
                                HStack(spacing: 24) { emailActions }
                                VStack(alignment: .leading, spacing: 4) { emailActions }
                            }
                        } else {
                            if codeSent {
                                Text(usesEmailLink ? "Finish signing in" : "Enter your email code")
                                    .shieldPageHeading().accessibilityAddTraits(.isHeader)
                                Text(usesEmailLink ? "Use the same email address where you received the link." : "Type the code we sent to \(email).")
                                    .foregroundStyle(ShieldTheme.secondaryText)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Text(codeSent && !usesEmailLink ? "Email code" : "Your email")
                                .font(.subheadline.weight(.semibold)).foregroundStyle(ShieldTheme.ink)
                            Group {
                                if codeSent && !usesEmailLink {
                                    TextField("Email code", text: $code, prompt: Text("Email code").foregroundStyle(ShieldTheme.secondaryText))
                                        .textContentType(.oneTimeCode).keyboardType(.numberPad)
                                        .focused($focusedField, equals: .code)
                                        .accessibilityLabel("Email code")
                                } else {
                                    HStack(spacing: ShieldTheme.Spacing.regular) {
                                    TextField("Email address", text: $email, prompt: Text("you@example.com").foregroundStyle(ShieldTheme.secondaryText), axis: .vertical)
                                        .lineLimit(1...3)
                                        .textContentType(.emailAddress).keyboardType(.emailAddress)
                                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                                        .focused($focusedField, equals: .email).accessibilityLabel("Email address")
                                        #if DEBUG && targetEnvironment(simulator)
                                        .onChange(of: email) { _, value in
                                            if value == AppState.testAccountSequence { focusedField = nil; model.exploreTestAccount() }
                                        }
                                        #endif
                                        if !email.isEmpty && focusedField == .email {
                                            Button("Clear") { email = ""; error = nil }
                                                .font(.subheadline).frame(minWidth: 52, minHeight: ShieldTheme.Layout.minimumTarget)
                                                .accessibilityLabel("Clear email address").accessibilityInputLabels(["Clear", "Clear email address"])
                                        }
                                    }
                                }
                            }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .padding(16)
                            .background(ShieldTheme.card, in: .rect(cornerRadius: 14))
                            .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(focusedField == nil ? ShieldTheme.fieldBorder : ShieldTheme.action, lineWidth: focusedField == nil && contrast != .increased ? 1 : 2) }
                            .disabled(working).submitLabel(.continue)
                            .onSubmit { if canSubmit { Task { await submit() } } }
                            if !email.isEmpty && !validEmail && focusedField != .email && !(codeSent && !usesEmailLink) {
                                Text("Check the email address, including the part after @.")
                                    .foregroundStyle(ShieldTheme.secondaryText)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Button { Task { await submit() } } label: {
                                ShieldActionLabel(title: buttonTitle, isWorking: working)
                            }
                            .shieldPrimaryButton().disabled(!canSubmit)
                            if codeSent { changeEmailButton }
                            else {
                                Text(usesEmailLink ? "We’ll email you a sign-in link." : "We’ll email you a code.")
                                    .font(.body).foregroundStyle(ShieldTheme.secondaryText)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        if let error {
                            ShieldNotice(title: "Couldn’t sign in", detail: error, symbol: "exclamationmark.circle")
                                .accessibilityIdentifier("sign-in-error")
                                .accessibilityFocused($statusFocused, equals: .error)
                        }
                        if model.configuration.baseURL == nil {
                            Text("Sign-in isn’t ready. You can try the sample app.")
                                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        }
                    }

                    if !codeSent {
                        Button("Try sample app") { model.exploreDemo() }
                            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget).disabled(working)
                    }
                    if let origin = model.configuration.baseURL {
                        Link("Privacy", destination: origin.appending(path: "privacy"))
                            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
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
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { focusedField = nil }
                }
            }
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
                Text(working ? "Sending…" : "Resend link")
            }
            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
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
        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
        .disabled(working)
    }

    private var canSubmit: Bool {
        !working && model.configuration.baseURL != nil &&
        validEmail && (!(codeSent && !usesEmailLink) || code.count >= 6)
    }

    private var validEmail: Bool {
        let address = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = address.split(separator: "@", omittingEmptySubsequences: false)
        guard parts.count == 2, !parts[0].isEmpty, !address.contains(where: \.isWhitespace) else { return false }
        let domain = parts[1].split(separator: ".", omittingEmptySubsequences: false)
        return domain.count >= 2 && domain.allSatisfy { !$0.isEmpty }
    }

    private var buttonTitle: String {
        if working { return codeSent && (!usesEmailLink || !code.isEmpty) ? "Signing in…" : "Sending email…" }
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
        if validEmail { await submit() }
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
                statusFocused = usesEmailLink ? .emailSent : nil
            }
        } catch { self.error = error.localizedDescription; statusFocused = .error }
    }
}

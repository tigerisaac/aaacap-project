import SwiftUI

struct SignInView: View {
    @Environment(AppState.self) private var model
    @State private var email = ""
    @State private var code = ""
    @State private var codeSent = false
    @State private var usesEmailLink = true
    @State private var working = false
    @FocusState private var focusedField: Field?
    private enum Field { case email, code }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 36) {
                    HStack(spacing: 11) {
                        Image(systemName: "phone.bubble.fill")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(ShieldTheme.action)
                            .frame(width: 44, height: 44)
                            .background(ShieldTheme.action.opacity(0.09), in: .rect(cornerRadius: 14))
                            .accessibilityHidden(true)
                        Text("Shield").font(.title2.weight(.semibold))
                    }

                    VStack(alignment: .leading, spacing: 24) {
                        Text(waitingForLink ? "Check your email" : codeSent && !usesEmailLink ? "Enter code" : "Sign in")
                            .font(.title2.weight(.semibold))
                            .accessibilityAddTraits(.isHeader)

                        if waitingForLink {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(email)
                                    .font(.body.weight(.medium))
                                    .textSelection(.enabled)
                                    .fixedSize(horizontal: false, vertical: true)
                                Text("Open the link to sign in.")
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                            ViewThatFits(in: .horizontal) {
                                HStack(spacing: 24) { emailActions }
                                VStack(alignment: .leading, spacing: 4) { emailActions }
                            }
                        } else {
                            VStack(alignment: .leading, spacing: 12) {
                                if codeSent && usesEmailLink {
                                    Text("Confirm the email used for this link.")
                                        .font(.subheadline).foregroundStyle(.secondary)
                                }
                                Group {
                                    if codeSent && !usesEmailLink {
                                        TextField("Verification code", text: $code)
                                            .textContentType(.oneTimeCode)
                                            .keyboardType(.numberPad)
                                            .focused($focusedField, equals: .code)
                                            .accessibilityLabel("Email verification code")
                                    } else {
                                        TextField("Email address", text: $email)
                                            .textContentType(.emailAddress)
                                            .keyboardType(.emailAddress)
                                            .textInputAutocapitalization(.never)
                                            .autocorrectionDisabled()
                                            .focused($focusedField, equals: .email)
                                            .accessibilityLabel("Email address")
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 16)
                                .frame(minHeight: 56)
                                .background(ShieldTheme.card, in: .rect(cornerRadius: 14))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 14)
                                        .strokeBorder(focusedField == nil ? Color.primary.opacity(0.12) : ShieldTheme.action, lineWidth: focusedField == nil ? 1 : 2)
                                }
                                .disabled(working)
                                .submitLabel(.continue)
                                .onSubmit { if canSubmit { Task { await submit() } } }

                                Button { Task { await submit() } } label: {
                                    HStack(spacing: 10) {
                                        if working { ProgressView().tint(ShieldTheme.actionInk) }
                                        Text(buttonTitle).fixedSize(horizontal: false, vertical: true)
                                    }
                                    .font(.body.weight(.semibold))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 16)
                                    .frame(maxWidth: .infinity, minHeight: 56)
                                    .foregroundStyle(canSubmit ? ShieldTheme.actionInk : ShieldTheme.action)
                                    .background(ShieldTheme.action.opacity(canSubmit ? 1 : 0.12), in: .rect(cornerRadius: 14))
                                }
                                .buttonStyle(.plain)
                                .disabled(!canSubmit)

                                if codeSent { changeEmailButton }
                            }
                        }

                        if model.configuration.baseURL == nil {
                            Text("Sign-in is unavailable.")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }

                        if !codeSent {
                            Button("View demo") { model.exploreDemo() }
                                .font(.subheadline)
                                .frame(minHeight: 44)
                                .disabled(working)
                        }
                    }

                    #if DEBUG
                    if !codeSent && model.configuration.demoToken != nil {
                        HStack {
                            Button("Local participant") { Task { working = true; await model.connectLocalDemo(); working = false } }
                            Spacer()
                            Button("Local caregiver") { Task { working = true; await model.connectLocalDemo(caregiver: true); working = false } }
                        }
                        .font(.caption).buttonStyle(.bordered).controlSize(.large)
                        .disabled(working)
                    }
                    #endif
                }
                .padding(28)
                .frame(maxWidth: 520, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(ShieldTheme.surface)
            .toolbar(.hidden, for: .navigationBar)
        }
        .task {
            #if DEBUG
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
        defer { working = false }
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
        } catch { model.handle(error) }
    }
}

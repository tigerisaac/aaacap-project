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
                VStack(alignment: .leading, spacing: 28) {
                    Image(systemName: "phone.bubble.fill")
                        .font(.largeTitle.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(24)
                        .background(ShieldTheme.action, in: .rect(cornerRadius: 28))
                        .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Shield").font(.largeTitle.bold())
                        Text("A clearer picture\nof your calls.")
                            .font(.title2.weight(.medium))
                        Text("For you and the people you care about.")
                            .font(.body).foregroundStyle(.secondary)
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        if codeSent && !usesEmailLink {
                            Text("Check your email").font(.headline)
                            TextField("Verification code", text: $code)
                                .textContentType(.oneTimeCode)
                                .keyboardType(.numberPad)
                                .textFieldStyle(.roundedBorder)
                                .focused($focusedField, equals: .code)
                                .accessibilityLabel("Email verification code")
                        } else {
                            TextField("Email address", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .textFieldStyle(.roundedBorder)
                                .focused($focusedField, equals: .email)
                                .accessibilityLabel("Email address")
                        }
                        if codeSent && usesEmailLink {
                            Label(code.isEmpty ? "Open the sign-in link in your email." : "Confirm your email to finish signing in.", systemImage: "envelope.open")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Button {
                            Task { await submit() }
                        } label: {
                            HStack {
                                Spacer()
                                if working { ProgressView().tint(.white) }
                                Text(buttonTitle).fontWeight(.semibold)
                                Spacer()
                            }
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(working || (codeSent && !usesEmailLink ? code.count < 6 : !email.contains("@")) || model.configuration.baseURL == nil)
                        if codeSent {
                            Button("Use a different email") { codeSent = false; code = "" }
                                .frame(minHeight: 44)
                                .disabled(working)
                        }
                    }

                    if model.configuration.baseURL == nil {
                        Label("Service setup is still in progress.", systemImage: "wrench.and.screwdriver")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                    Button("Explore the demo", systemImage: "play.circle") { model.exploreDemo() }
                        .disabled(working)
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .frame(maxWidth: .infinity)

                    #if DEBUG
                    if model.configuration.demoToken != nil {
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
                .padding(.top, 28)
            }
            .background(ShieldTheme.surface)
        }
        .task {
            guard model.configuration.baseURL != nil else { return }
            if let service: ServiceConfiguration = try? await model.api.send("/public/config", authenticated: false) {
                usesEmailLink = service.signInMethod == "email-link"
            }
        }
        .onOpenURL { url in Task { await receiveLink(url) } }
    }

    private var buttonTitle: String {
        if usesEmailLink {
            if !code.isEmpty { return "Finish signing in" }
            return codeSent ? "Send another link" : "Continue with email"
        }
        return codeSent ? "Sign in" : "Continue with email"
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

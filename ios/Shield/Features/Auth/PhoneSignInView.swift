import SwiftUI

struct PhoneSignInView: View {
    @Environment(AppState.self) private var model
    @State private var phone = ""
    @State private var code = ""
    @State private var challenge: PhoneChallenge?
    @State private var resendAt = Date.distantPast
    @State private var working = false
    @State private var error: String?
    @State private var showingEmail = false
    @State private var emailLink: URL?
    @FocusState private var focus: Field?
    private enum Field { case phone, code }
    private var normalizedPhone: String? { MobileNumber.normalized(phone) }
    private var validCode: Bool { (4...8).contains(code.count) && code.allSatisfy(\.isNumber) }
    private var fixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        ProcessInfo.processInfo.arguments.contains("--uitesting-phone-sign-in")
        #else
        false
        #endif
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                    ShieldBrand(compact: true)
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                        Text(challenge == nil ? "Help with unfamiliar calls" : "Enter your code")
                            .shieldHeading(.hero).accessibilityAddTraits(.isHeader)
                        Text(challenge == nil ? "Shield asks why someone is calling. You choose whether to answer." : "Type the code we texted to \(PhoneDisplay.format(normalizedPhone ?? phone)).")
                            .font(.title3).foregroundStyle(ShieldTheme.secondaryText)
                    }
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                        Text(challenge == nil ? "Your mobile number" : "Verification code").font(.headline)
                        if challenge == nil {
                            TextField("Mobile number", text: $phone, prompt: Text("Mobile number").foregroundStyle(ShieldTheme.secondaryText))
                                .textContentType(.telephoneNumber).keyboardType(.phonePad)
                                .focused($focus, equals: .phone).accessibilityIdentifier("sign-in-phone")
                                .padding(16).background(ShieldTheme.card, in: .rect(cornerRadius: 14))
                                .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(ShieldTheme.fieldBorder, lineWidth: 1) }
                        } else {
                            TextField("Code", text: $code, prompt: Text("Code").foregroundStyle(ShieldTheme.secondaryText))
                                .textContentType(.oneTimeCode).keyboardType(.numberPad)
                                .focused($focus, equals: .code).accessibilityIdentifier("sign-in-phone-code")
                                .padding(16).background(ShieldTheme.card, in: .rect(cornerRadius: 14))
                                .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(ShieldTheme.fieldBorder, lineWidth: 1) }
                        }
                        if challenge == nil {
                            Text("US and Canadian mobile numbers. Message and data rates may apply.")
                                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }.disabled(working)
                    if let error { ShieldNotice(title: "Couldn’t sign in", detail: error, symbol: "exclamationmark.circle").accessibilityIdentifier("phone-sign-in-error") }
                    Button { Task { await submit() } } label: {
                        ShieldActionLabel(title: working ? "Please wait…" : challenge == nil ? "Text me a code" : "Sign in", isWorking: working)
                    }
                    .shieldPrimaryButton().disabled(working || normalizedPhone == nil || (challenge != nil && !validCode))
                    .accessibilityIdentifier("phone-sign-in-submit")
                    // Secondary choices stack as one quiet group of full-width targets below the action.
                    VStack(alignment: .leading, spacing: 0) {
                        if challenge != nil {
                            TimelineView(.periodic(from: .now, by: 1)) { context in
                                let seconds = max(0, Int(ceil(resendAt.timeIntervalSince(context.date))))
                                secondaryButton(seconds > 0 ? "Resend code in \(seconds)s" : "Resend code") { Task { await requestCode() } }
                                    .disabled(working || seconds > 0)
                                    .accessibilityIdentifier("phone-sign-in-resend")
                            }
                            secondaryButton("Change number") { challenge = nil; code = ""; error = nil; focus = .phone }
                                .disabled(working)
                        } else {
                            secondaryButton("Try sample app") { model.exploreDemo() }.disabled(working)
                            secondaryButton("Use email instead") { showingEmail = true }.disabled(working)
                        }
                        if let base = model.configuration.baseURL {
                            Link(destination: base.appending(path: "privacy")) {
                                Text("Privacy").foregroundStyle(ShieldTheme.action)
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                                    .contentShape(.rect)
                            }.buttonStyle(.plain)
                        }
                    }
                }
                .padding(ShieldTheme.Spacing.page)
                .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }
            .background(ShieldTheme.surface).scrollDismissesKeyboard(.interactively)
            .toolbar(.hidden, for: .navigationBar)
            .toolbar { ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { focus = nil } } }
            .sheet(isPresented: $showingEmail) { SignInView(incomingURL: emailLink, allowsDismissal: true) }
            .onOpenURL { url in emailLink = url; showingEmail = true }
        }
    }

    private func secondaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.body.weight(.medium))
                .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                .contentShape(.rect)
        }
    }

    private func requestCode() async {
        guard let phone = normalizedPhone, !working else { return }
        working = true; error = nil; focus = nil
        defer { working = false }
        do {
            if fixture { challenge = PhoneChallenge(challenge: "synthetic", expiresIn: 300, resendAfter: 60) }
            else { challenge = try await model.api.requestPhoneCode(phone: phone) }
            resendAt = .now.addingTimeInterval(TimeInterval(challenge?.resendAfter ?? 60))
            code = ""; focus = .code
        } catch { self.error = error.localizedDescription }
    }
    private func submit() async {
        guard !working else { return }
        guard let challenge else { await requestCode(); return }
        working = true; error = nil; focus = nil
        defer { working = false }
        do {
            if fixture {
                guard code == "123456" else { throw APIError.service(code: "phone_code_incorrect", status: 401) }
                model.exploreDemo(); return
            }
            try await model.api.signIn(challenge: challenge.challenge, code: code)
            await model.didSignIn()
        } catch { self.error = error.localizedDescription }
    }
}

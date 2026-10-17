import SwiftUI

struct DisconnectView: View {
    let participantID: UUID
    var forDeletion = false
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = DisconnectModel()
    @State private var help = false
    @State private var confirmCancellation = false
    @State private var prepared = false
    @State private var phoneBanner = false
    @State private var guide = SetupGuidePlayer()
    @State private var settingsIndex = 3
    @State private var showVoicemailPreference = false
    @AccessibilityFocusState private var headingFocused: Bool
    @AccessibilityFocusState private var errorFocused: Bool
    private var current: RestorationStatus.Step? { model.status?.current }
    private var started: Bool { model.status?.id != nil }
    private var finished: Bool { model.status?.completed == true }
    private var title: String {
        if finished { return "Your phone is disconnected" }
        if !started { return "Bring back ordinary calls" }
        switch current?.kind {
        case "code", "carrier": return "Bring calls back to your phone"
        case "settings": return "Let ordinary calls ring"
        case "voicemailSettings": return "Check carrier voicemail next"
        case "call": return "Check that calls reach you"
        default: return "Check your normal voicemail"
        }
    }
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if let cancellation = model.cancellation {
                        Text("Disconnection cancelled").shieldPageHeading().accessibilityAddTraits(.isHeader)
                            .id("disconnect-top").accessibilityFocused($headingFocused)
                        Text(cancellation.setupReviewRequired
                            ? "Let’s check your phone setup before relying on Shield again. Cancelling does not undo changes to your carrier or iPhone settings."
                            : "You’re keeping Shield. Your existing call-check settings are unchanged.")
                        if cancellation.setupReviewRequired {
                            NavigationLink(value: AppRoute.forwardingSetup) { ShieldActionLabel(title: "Open phone setup") }
                                .shieldPrimaryButton()
                        }
                        Button("Done") { dismiss() }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    } else if let status = model.status {
                        Color.clear.frame(height: 0).id("disconnect-top").accessibilityHidden(true)
                        if started && !finished { FlowProgress(title: "Disconnect Shield", current: status.index + 1, total: status.steps.count) }
                        Text(title).shieldPageHeading().id("disconnect-heading")
                            .accessibilityAddTraits(.isHeader).accessibilityFocused($headingFocused)
                            .accessibilityIdentifier(finished ? "restoration-complete" : "disconnect-heading")
                        if finished { completion }
                        else if !started { introduction }
                        else { stepContent(status) }
                        if let error = model.error {
                            ShieldNotice(title: model.cancellationFailed ? "Couldn’t confirm cancellation" : started ? "This step isn’t saved yet" : "Couldn’t start guided disconnect", detail: error, symbol: "exclamationmark.circle")
                                .id("disconnect-error").accessibilityFocused($errorFocused)
                            Button("Refresh progress") { Task { await model.load(app, id: participantID, refresh: true) } }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        }
                        if typeSize.isAccessibilitySize { action }
                        if started && !finished {
                            Button("Something didn’t work", systemImage: "questionmark.circle") { help = true }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            cancelButton
                            Text("Close saves your place to continue later. Cancel disconnection lets you keep using Shield.")
                                .foregroundStyle(ShieldTheme.secondaryText)
                        }
                    } else {
                        if model.working { ProgressView("Getting your phone steps…") }
                        if let error = model.error {
                            ShieldNotice(title: "Steps couldn’t load", detail: error, symbol: "wifi.exclamationmark")
                            Button("Try again") { Task { await model.load(app, id: participantID) } }
                        }
                    }
                }.padding(24).frame(maxWidth: 560, alignment: .leading).frame(maxWidth: .infinity)
            }
            .onChange(of: model.status?.index) { _, _ in
                prepared = false; phoneBanner = false; guide.stop()
                proxy.scrollTo("disconnect-top", anchor: .top); headingFocused = true
            }
            .onChange(of: model.cancellation?.session) { _, _ in proxy.scrollTo("disconnect-top", anchor: .top); headingFocused = true }
            .onChange(of: model.status?.id) { _, _ in proxy.scrollTo("disconnect-top", anchor: .top); headingFocused = true }
            .onChange(of: model.error) { _, value in
                if value != nil { proxy.scrollTo("disconnect-error", anchor: .top); errorFocused = true }
            }
        }
        .background(ShieldTheme.surface)
        .safeAreaInset(edge: .bottom) {
            if model.status != nil && model.cancellation == nil && !typeSize.isAccessibilitySize {
                action.padding(.horizontal, 24).padding(.vertical, 12).background(ShieldTheme.surface)
            }
        }
        .navigationTitle("Disconnect Shield").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() }.disabled(model.working) } }
        .phoneLauncherBanner(isPresented: $phoneBanner)
        .task { await model.load(app, id: participantID, refresh: true) }
        .onDisappear { guide.stop() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { guide.returnedToShield(); phoneBanner = false }
        }
        .sheet(isPresented: $help) {
            NavigationStack {
                List {
                    Text("Stay on this step until it works. Opening Phone or Settings does not confirm a change.")
                    Text("If a carrier code gives an error, check the correct SIM is selected and that you have cellular service. Your carrier can help restore the forwarding settings for your line.")
                    Text("For the call checks, use any other phone or ask someone you trust. A Shield helper account is not needed.")
                    Button("Review carrier steps again") { help = false; Task { await model.advance(app, id: participantID, restart: true) } }
                    Button("Keep my place") { help = false }
                }.navigationTitle("Help disconnecting").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { help = false } } }
            }
        }
        .navigationDestination(isPresented: $showVoicemailPreference) {
            ScrollView { RestorationSettingsGuide(index: $settingsIndex).padding(24) }
                .background(ShieldTheme.surface).navigationTitle("Live Voicemail")
        }
    }
    private var cancelButton: some View {
        Button(model.cancelling ? "Cancelling…" : "Cancel disconnection") { confirmCancellation = true }
            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.working)
            .accessibilityIdentifier("disconnect-cancel")
            .confirmationDialog("Keep using Shield?", isPresented: $confirmCancellation, titleVisibility: .visible) {
                if (model.status?.index ?? 0) == 0 && model.status?.settingsChanged != true {
                    Button("I haven’t changed settings") { Task { await model.cancel(app, id: participantID, settingsUnchanged: true) } }
                }
                Button("Review my phone setup") { Task { await model.cancel(app, id: participantID, settingsUnchanged: false) } }
                Button("Keep disconnecting", role: .cancel) { }
            } message: {
                Text("If you changed any carrier or iPhone settings, or aren’t sure, review your phone setup. Close only saves your place in this guide.")
            }
    }

    private var introduction: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("We’ll take this one step at a time.").font(.title3)
            ShieldDisclosure("Read all phone steps") {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Restore carrier forwarding").font(.headline)
                    if model.localInstructions.isEmpty {
                        Text("Ask your carrier to restore ordinary calls and voicemail for the line you connected to Shield, including busy, unanswered and unreachable calls. Use the instructions for your line; reset codes differ by carrier.")
                    } else {
                        ForEach(Array(model.localInstructions.enumerated()), id: \.offset) { index, text in
                            DisconnectInstruction(number: index + 1, title: text, detail: "")
                        }
                    }
                    RestorationSettingsGuide(index: .constant(3))
                    RestorationSettingsGuide(index: .constant(4), checkingCarrier: true)
                    Text("Check calls and voicemail").font(.headline)
                    Text("From another phone, call your usual number and answer. Check that you can hear each other without a Shield greeting or request to press 1. End the call.")
                    Text("Call again and leave it unanswered. Leave a message at your carrier’s voicemail, then open Phone and listen to it. Keep Live Voicemail off during this check.")
                    Text("Reading these steps does not turn off Shield’s service. Continue the guided checks when you’re connected to finish disconnecting.")
                        .foregroundStyle(ShieldTheme.secondaryText)
                }
            }
            DisconnectInstruction(number: 1, title: "Restore your phone settings", detail: "Use the instructions saved for your mobile line.")
            DisconnectInstruction(number: 2, title: "Check calls and voicemail", detail: "You’ll need another phone, or someone who can call you.")
            DisconnectInstruction(number: 3, title: forDeletion ? "Delete your account" : "Choose what to keep", detail: forDeletion ? "Return here to finish after your phone works normally." : "Disconnecting keeps your account and saved messages.")
            Text("Shield keeps its current service available while you follow the steps. Changing your carrier settings is what stops calls going to Shield.")
                .foregroundStyle(ShieldTheme.secondaryText)
        }
    }
    private var completion: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("You confirmed that calls reach you and a message reaches your carrier voicemail. Shield’s call service is now off.")
            Text("These checks are based on what you told us. Shield cannot read your carrier or iPhone settings.").foregroundStyle(ShieldTheme.secondaryText)
            if forDeletion { Text("Your account is still here. Next, review what will be deleted.") }
            else { Text("Your account and saved messages are still here.") }
            Button("Turn Live Voicemail back on (optional)") { settingsIndex = 4; showVoicemailPreference = true }
                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
            if !forDeletion {
                NavigationLink { DeleteAccountView() } label: { Text("Delete my account too").frame(minHeight: ShieldTheme.Layout.minimumTarget) }
            }
        }
    }
    @ViewBuilder private func stepContent(_ status: RestorationStatus) -> some View {
        switch current?.kind {
        case "code":
            Text("Use the mobile line you connected to Shield. Wait for \(status.carrier) to confirm each change.")
            SetupGuideView(guide: .keypad, player: guide)
            if prepared { Label("Code copied", systemImage: "checkmark.circle").font(.headline) }
            ShieldDisclosure("Read the steps") { PhoneCodeGuide(restoring: true, carrier: status.carrier) }
            ShieldDisclosure("See the code") { Text(current?.code ?? "").font(.body.monospaced()) }
            if prepared {
                Button("Copy code and show Phone again") { prepareCode() }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
            }
        case "carrier":
            Text("Follow the saved instructions for this mobile line. Restore all forwarding conditions, including busy, unanswered and unreachable calls.")
            if status.instructions.isEmpty {
                Text("No original carrier instructions were saved. If you haven’t already restored your line, get the correct instructions from your carrier. Shield won’t guess a reset code.")
            } else {
                ForEach(Array(status.instructions.enumerated()), id: \.offset) { index, text in DisconnectInstruction(number: index + 1, title: text, detail: "") }
            }
            Text("Already disconnected? Confirm only if your carrier settings no longer send any calls to Shield.").foregroundStyle(ShieldTheme.secondaryText)
        case "settings":
            RestorationSettingsGuide(index: .constant(3), showsTitle: false)
        case "voicemailSettings":
            RestorationSettingsGuide(index: .constant(4), showsTitle: false, checkingCarrier: true)
        case "call":
            DisconnectInstruction(number: 1, title: "Call your usual number", detail: "Use another phone, or ask someone you trust to call.")
            DisconnectInstruction(number: 2, title: "Answer and say hello", detail: "Check that you can hear each other. There should be no Shield greeting or request to press 1.")
            Text("End the call before continuing.").foregroundStyle(ShieldTheme.secondaryText)
        default:
            DisconnectInstruction(number: 1, title: "Call your usual number again", detail: "Leave it unanswered. The caller should hear your normal carrier voicemail greeting, not Shield.")
            DisconnectInstruction(number: 2, title: "Leave a short message", detail: "Open Phone and listen to the new message in your voicemail.")
            Text("Keep Live Voicemail off during this check so you test your carrier’s voicemail. You can turn it back on afterward.").foregroundStyle(ShieldTheme.secondaryText)
        }
    }
    private var action: some View {
        Button {
            if finished { dismiss(); if !forDeletion { Task { await app.refresh() } } }
            else if current?.kind == "code", started, !prepared { prepareCode() }
            else { Task { await model.advance(app, id: participantID) } }
        } label: { ShieldActionLabel(title: actionTitle, isWorking: model.working && !model.cancelling) }
            .shieldPrimaryButton().disabled(model.working || (app.isDemo && !model.fixture))
            .accessibilityIdentifier("disconnect-continue")
    }
    private var actionTitle: String {
        if finished { return forDeletion ? "Continue to account deletion" : "Done" }
        if !started { return "Start disconnecting" }
        switch current?.kind {
        case "code": return prepared ? "My carrier confirmed the change" : "Copy phone code"
        case "carrier": return "My carrier forwarding is restored"
        case "settings": return "I selected Never"
        case "voicemailSettings": return "Live Voicemail is off"
        case "call": return "The call worked"
        default: return "I heard the voicemail message"
        }
    }
    private func prepareCode() {
        guard let code = current?.code else { return }
        PhoneAppLink.copy(code: code); prepared = true
        if !model.fixture { guide.resumeForHandoff(); phoneBanner = true }
    }
}

private struct DisconnectInstruction: View {
    let number: Int
    let title: String
    let detail: String
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        if typeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 8) {
                Text("Step \(number)").font(.headline).foregroundStyle(ShieldTheme.action)
                Text(title).font(.headline)
                if !detail.isEmpty { Text(detail).foregroundStyle(ShieldTheme.secondaryText) }
            }.fixedSize(horizontal: false, vertical: true).accessibilityElement(children: .combine)
        } else { SetupInstruction(number: number, title: title, detail: detail) }
    }
}

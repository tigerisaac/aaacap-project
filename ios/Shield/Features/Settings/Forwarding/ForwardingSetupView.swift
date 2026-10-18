import SwiftUI

struct ForwardingSetupView: View {
    @Environment(AppState.self) private var app
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var model = ForwardingSetupModel()
    @State private var confirmRestore = false
    @State private var leftForPhone = false
    @State private var leftForGuide = false
    @State private var loadingVisible = false
    @AccessibilityFocusState private var focusedStep: ForwardingStep?
    @AccessibilityFocusState private var errorFocused: Bool

    var body: some View {
        Group {
            if app.isDemo && !model.isUITest {
                ShieldEmptyState(title: "Phone setup", symbol: "phone",
                                 detail: "Phone setup is done with a helper, one step at a time. The sample app doesn’t change your phone.")
                    .background(ShieldTheme.surface)
                    .navigationTitle("Phone setup").navigationBarTitleDisplayMode(.inline)
            } else if model.step == .restore, let id = model.status?.participantId {
                DisconnectView(participantID: id)
            } else { setupBody }
        }.task { if !app.isDemo || model.isUITest { await model.load(app) } }
    }
    private var setupBody: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                    if let status = model.status {
                        Color.clear.frame(height: 0).id("forwarding-top").accessibilityHidden(true)
                        if model.step.progressIndex > 0 {
                            FlowProgress(title: model.step.progressTitle, current: model.progressIndex, total: model.progressTotal)
                        }
                        // The heading sits closer to its own content than to the progress above it.
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.card) {
                            Text(model.pageTitle).shieldPageHeading().id("forwarding-heading")
                                .accessibilityAddTraits(.isHeader).accessibilityFocused($focusedStep, equals: model.step)
                                .task(id: model.step) { focusedStep = model.step }
                            if model.step == .ring || model.step == .test {
                                ForwardingProbeView(model: model)
                            } else if model.isPhoneSettingsStep {
                                ForwardingPhoneSettingsView(model: model)
                            } else if model.step.codeIndex != nil {
                                ForwardingCodeView(model: model)
                            } else {
                                ForwardingStepContent(step: model.step, status: status, model: model, onRestorationStageChange: { proxy.scrollTo("forwarding-heading", anchor: .top) })
                            }
                        }.id(model.step)
                        if let error = model.error {
                            VStack(alignment: .leading, spacing: 8) {
                                ShieldNotice(title: "This step didn’t finish", detail: error, symbol: "exclamationmark.circle")
                                    .accessibilityIdentifier("forwarding-error")
                                    .accessibilityFocused($errorFocused)
                                if model.step == .save {
                                    Link("Allow Contacts in Settings", destination: URL(string: UIApplication.openSettingsURLString)!)
                                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                }
                            }
                            .id("forwarding-step-error")
                        }
                        if typeSize.isAccessibilitySize {
                            ForwardingActions(model: model, app: app, inline: true)
                        }
                    } else if let error = model.error {
                        ShieldLoadFailure(title: "Setup couldn’t load", detail: error) { Task { await model.load(app) } }
                    } else if loadingVisible {
                        ShieldLoadingView(title: "Getting your phone setup…")
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(ShieldTheme.Spacing.page)
                .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }
            .onChange(of: model.error) { _, value in
                guard value != nil, model.status != nil else { return }
                proxy.scrollTo("forwarding-step-error", anchor: .top)
                errorFocused = true
            }
            .onChange(of: model.errorRevision) { _, _ in
                guard model.error != nil, model.status != nil else { return }
                proxy.scrollTo("forwarding-step-error", anchor: .top)
                errorFocused = true
            }
            .onChange(of: model.pageTitle) { _, _ in
                proxy.scrollTo("forwarding-top", anchor: .top)
                focusedStep = model.step
            }
            .onChange(of: model.step) { _, _ in
                proxy.scrollTo("forwarding-top", anchor: .top)
                focusedStep = model.step
            }
        }
        .phoneLauncherBanner(isPresented: $model.showingPhoneLauncher)
        .deferredLoading(model.status == nil && model.error == nil, visible: $loadingVisible)
        .background(ShieldTheme.surface)
        .safeAreaInset(edge: .bottom) {
            if model.status != nil && !typeSize.isAccessibilitySize {
                ForwardingActions(model: model, app: app)
            }
        }
        .navigationTitle("Phone setup").navigationBarTitleDisplayMode(.inline)
        .sensoryFeedback(.success, trigger: model.step) { old, new in
            (ForwardingStep.allCases.firstIndex(of: new) ?? 0) > (ForwardingStep.allCases.firstIndex(of: old) ?? 0)
        }
        .navigationBarBackButtonHidden(model.previousStep != nil)
        .toolbar {
            if let previous = model.previousStep {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back", systemImage: "chevron.left") {
                        Task { do { try await model.move(to: previous, app: app) } catch { model.reportError(error.localizedDescription) } }
                    }
                    .labelStyle(.titleAndIcon).disabled(model.working || model.probeWaiting)
                    .accessibilityLabel("Previous step")
                    .accessibilityIdentifier("forwarding-previous")
                    .accessibilityInputLabels(["Back", "Previous step"])
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Close") { dismiss() }.disabled(model.working)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu("Options", systemImage: "ellipsis.circle") {
                    Button("Disconnect Shield", systemImage: "arrow.uturn.backward") { confirmRestore = true }
                }
                .labelStyle(.titleOnly).accessibilityLabel("Setup options")
                .accessibilityIdentifier("Setup options")
                .accessibilityInputLabels(["Options", "Setup options"])
            }
        }
        .onDisappear { model.guidePlayer.stop(); model.shortcutGuidePlayer.stop() }
        .task(id: model.step) {
            guard [.ring, .test, .checks].contains(model.step) else { return }
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(3)) } catch { return }
                guard scenePhase == .active else { continue }
                await model.load(app)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            model.settingsSceneChanged(isActive: phase == .active, isBackground: phase == .background)
            model.codeSceneChanged(isActive: phase == .active, isBackground: phase == .background)
            if phase == .background && model.showingPhoneLauncher { leftForPhone = true }
            if phase == .active && leftForPhone {
                model.showingPhoneLauncher = false
                leftForPhone = false
            }
            if phase == .background { leftForGuide = true }
            if phase == .active && leftForGuide {
                model.guidePlayer.returnedToShield()
                model.shortcutGuidePlayer.returnedToShield()
                leftForGuide = false
            }
            if phase == .active { Task { await model.load(app) } }
        }
        .alert("Disconnect Shield?", isPresented: $confirmRestore) {
            Button("Start disconnecting") { Task { await model.restore(app) } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("We’ll guide you through restoring your phone settings, then checking calls and voicemail. Your account stays here unless you choose to delete it.")
        }
    }
}

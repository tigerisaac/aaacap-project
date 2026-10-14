import SwiftUI

struct ForwardingSetupView: View {
    @Environment(AppState.self) private var app
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var model = ForwardingSetupModel()
    @State private var confirmRestore = false
    @State private var leftForPhone = false
    @AccessibilityFocusState private var focusedStep: ForwardingStep?
    @AccessibilityFocusState private var errorFocused: Bool

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    if let status = model.status {
                        if model.step.progressIndex > 0 {
                            FlowProgress(title: model.step.progressTitle, current: model.step.progressIndex, total: 10)
                        }
                        // The heading sits closer to its own content than to the progress above it.
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.card) {
                            Text(model.step.title).shieldPageHeading().id("forwarding-heading")
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
                        }
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
                        if typeSize.isAccessibilitySize && model.step == .consent {
                            ForwardingActions(model: model, app: app, inline: true)
                        }
                    } else if let error = model.error {
                        ContentUnavailableView("Setup couldn’t load", systemImage: "wifi.exclamationmark", description: Text(error))
                        Button("Try again") { Task { await model.load(app) } }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    } else {
                        ProgressView("Loading phone setup…").frame(maxWidth: .infinity, minHeight: 220)
                    }
                }
                .padding(24)
                .frame(maxWidth: 560, alignment: .leading).frame(maxWidth: .infinity)
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
        }
        .id(model.step)
        .phoneLauncherBanner(isPresented: $model.showingPhoneLauncher)
        .background(ShieldTheme.surface)
        .shieldNavigationSurface()
        .safeAreaInset(edge: .bottom) {
            if model.status != nil && !(typeSize.isAccessibilitySize && model.step == .consent) {
                ForwardingActions(model: model, app: app)
                    .id(model.step)
            }
        }
        .navigationTitle("Phone setup").navigationBarTitleDisplayMode(.inline)
        .sensoryFeedback(.success, trigger: model.step) { old, new in
            (ForwardingStep.allCases.firstIndex(of: new) ?? 0) > (ForwardingStep.allCases.firstIndex(of: old) ?? 0)
        }
        .navigationBarBackButtonHidden(model.step.previous != nil)
        .toolbar {
            if let previous = model.step.previous {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back", systemImage: "chevron.left") {
                        Task { do { try await model.move(to: previous, app: app) } catch { model.reportError(error.localizedDescription) } }
                    }
                    .labelStyle(.titleAndIcon).disabled(model.working || model.probeWaiting)
                    .accessibilityLabel("Previous step")
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
        .task { await model.load(app) }
        .task(id: model.step) {
            guard [.ring, .test, .checks].contains(model.step) else { return }
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(3)) } catch { return }
                guard scenePhase == .active else { continue }
                await model.load(app)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            model.settingsSceneChanged(isActive: phase == .active)
            model.codeSceneChanged(isActive: phase == .active, isBackground: phase == .background)
            if phase == .background && model.showingPhoneLauncher { leftForPhone = true }
            if phase == .active && leftForPhone {
                model.showingPhoneLauncher = false
                leftForPhone = false
            }
            if phase == .active { Task { await model.load(app) } }
        }
        .alert("Disconnect Shield?", isPresented: $confirmRestore) {
            Button("Start disconnecting") { Task { await model.restore(app) } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Shield stops ringing you. Follow the steps to bring back ordinary calls and voicemail. Ending a test alone won’t disconnect your phone.")
        }
    }
}

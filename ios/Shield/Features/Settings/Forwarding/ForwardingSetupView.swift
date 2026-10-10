import SwiftUI

struct ForwardingSetupView: View {
    @Environment(AppState.self) private var app
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = ForwardingSetupModel()
    @State private var confirmRestore = false
    @State private var leftForPhone = false
    @AccessibilityFocusState private var headingFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                if let status = model.status {
                    Text(model.step.title).font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader).accessibilityFocused($headingFocused)
                    if model.step == .ring || model.step == .test {
                        ForwardingProbeView(model: model)
                    } else if model.isPhoneSettingsStep {
                        ForwardingPhoneSettingsView(model: model)
                    } else if model.step.codeIndex != nil {
                        ForwardingCodeView(model: model)
                    } else {
                        ForwardingStepContent(step: model.step, status: status, model: model)
                    }
                    if let error = model.error {
                        VStack(alignment: .leading, spacing: 8) {
                            Label(error, systemImage: "exclamationmark.circle")
                                .foregroundStyle(ShieldTheme.held).accessibilityIdentifier("forwarding-error")
                            if model.step == .save {
                                Link("Allow Contacts in Settings", destination: URL(string: UIApplication.openSettingsURLString)!)
                                    .frame(minHeight: 44)
                            }
                        }
                    }
                } else if let error = model.error {
                    ContentUnavailableView("Setup couldn’t load", systemImage: "wifi.exclamationmark", description: Text(error))
                    Button("Try again") { Task { await model.load(app) } }.frame(minHeight: 44)
                } else {
                    ProgressView("Loading phone setup…").frame(maxWidth: .infinity, minHeight: 220)
                }
            }
            .padding(24)
            .frame(maxWidth: 560, alignment: .leading).frame(maxWidth: .infinity)
        }
        .id(model.step)
        .phoneLauncherBanner(isPresented: $model.showingPhoneLauncher)
        .background(ShieldTheme.surface)
        .safeAreaInset(edge: .bottom) {
            if model.status != nil { ForwardingActions(model: model, app: app, confirmRestore: $confirmRestore) }
        }
        .navigationTitle(model.step.progress).navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(model.step.previous != nil)
        .toolbar {
            if let previous = model.step.previous {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Previous step", systemImage: "chevron.left") {
                        Task { do { try await model.move(to: previous, app: app) } catch { model.error = error.localizedDescription } }
                    }
                    .labelStyle(.iconOnly).disabled(model.working || model.probeWaiting)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu("Setup options", systemImage: "ellipsis.circle") {
                    Button("Restore my phone", systemImage: "arrow.uturn.backward") { confirmRestore = true }
                }
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
        .onChange(of: model.step) { _, _ in headingFocused = true }
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
        .confirmationDialog("Restore ordinary phone service?", isPresented: $confirmRestore, titleVisibility: .visible) {
            Button("Stop callbacks and begin restoration") { Task { await model.restore(app) } }
        } message: {
            Text("Shield will stop offering calls and guide you through restoring Tello. Ending a test alone does not undo forwarding.")
        }
    }
}

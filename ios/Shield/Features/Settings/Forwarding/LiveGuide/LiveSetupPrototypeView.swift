#if DEBUG
import SwiftUI

@available(iOS 27.0, *)
struct LiveSetupPrototypeView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = LiveSetupPrototypeModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("I’ll tell you when to stop")
                    .font(.largeTitle).bold()
                    .accessibilityAddTraits(.isHeader)
                Text("Open Phone settings and slowly slide your finger up. The floating guide will say “Stop here” when the right choices appear.")
                LiveSetupVideoSurface(guide: model.floating)
                    .aspectRatio(1.8, contentMode: .fit)
                    .clipShape(.rect(cornerRadius: 14))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 8) {
                    Text(model.instruction.title).font(.title2).bold()
                        .accessibilityIdentifier("live-guide-instruction")
                    Text(model.instruction.detail)
                }
                Text("With your permission, Shield reads the screen on this iPhone during this step. Nothing is saved or sent. The guide stops when you return to Shield, close it, or after two minutes.")
                    .foregroundStyle(.secondary)
                if let failure = model.capture.failure {
                    Text(failure).foregroundStyle(.primary)
                        .accessibilityIdentifier("live-guide-error")
                }
                if model.isDemo {
                    Text(model.floating.floating ? "Floating guide active" : "Practice screen")
                        .accessibilityIdentifier("live-guide-floating-status")
                }
                if model.handoffFailed {
                    Text("The floating guide couldn’t open. You can continue with the illustrated steps in Phone setup.")
                }
            }
            .padding(24)
        }
        .background(ShieldTheme.surface)
        .safeAreaInset(edge: .bottom) {
            Button("Open Phone settings") { model.capture.request() }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
                .disabled(model.isDemo || model.capture.requestingPermission || model.capture.active)
                .accessibilityIdentifier("live-guide-open-settings")
                .padding(24)
                .background(ShieldTheme.surface)
        }
        .navigationTitle("Phone setup")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.prepare() }
        .onChange(of: scenePhase) { _, phase in model.sceneChanged(phase) }
        .onDisappear { model.stop() }
    }
}
#endif

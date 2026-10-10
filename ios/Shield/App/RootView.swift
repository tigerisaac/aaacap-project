import SwiftUI
import UIKit

struct RootView: View {
    @Environment(AppState.self) private var model

    private var contactDemoAction: String? {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "--demo-contact"), args.indices.contains(index + 1), ["remove", "add"].contains(args[index + 1]) { return args[index + 1] }
        #endif
        return nil
    }
    private var isForwardingPreview: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding")
        #else
        false
        #endif
    }
    private var previewColorScheme: ColorScheme? {
        guard isForwardingPreview else { return nil }
        return ProcessInfo.processInfo.arguments.contains("--uitesting-dark") ? .dark : .light
    }
    var body: some View {
        @Bindable var model = model
        Group {
            #if DEBUG && targetEnvironment(simulator)
            if ProcessInfo.processInfo.arguments.contains("--uitesting-contact-storage") {
                ContactStorageCheckView()
            } else {
                content
            }
            #else
            content
            #endif
        }
        .preferredColorScheme(previewColorScheme)
        .onAppear {
            #if DEBUG
            if isForwardingPreview { UIApplication.shared.isIdleTimerDisabled = true }
            #endif
        }
        .alert("Something needs attention", isPresented: $model.showingError) {
            Button("OK") { model.errorMessage = nil }
        } message: {
            Text(model.errorMessage ?? "")
        }
    }

    @ViewBuilder private var content: some View {
            @Bindable var model = model
            if isForwardingPreview {
                NavigationStack {
                    ForwardingSetupView()
                        .safeAreaInset(edge: .top) { Text("Demo · No calls placed").font(.caption).padding(8).frame(maxWidth: .infinity).background(ShieldTheme.surface) }
                }
            } else if let contactDemoAction, model.signedIn, model.isOwner {
                NavigationStack { SharedContactsView(demoAction: contactDemoAction) }
            } else if model.signedIn {
                VStack(spacing: 0) {
                    if model.isDemo { DemoBanner() }
                    if model.people.isEmpty {
                        JoinView()
                    } else {
                        TabView(selection: $model.selectedTab) {
                            Tab("Today", systemImage: "square.grid.2x2.fill", value: 0) {
                                OverviewView().id(model.selectedPersonID)
                            }
                            Tab("Calls", systemImage: "phone.fill", value: 1) {
                                CallsView().id(model.selectedPersonID)
                            }
                            Tab("Check", systemImage: "text.magnifyingglass", value: 2) {
                                CheckView().id(model.selectedPersonID)
                            }
                            Tab("People", systemImage: "person.2.fill", value: 3) {
                                PeopleView().id(model.selectedPersonID)
                            }
                        }
                    }
                }
            } else {
                SignInView()
            }
    }
}

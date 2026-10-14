#if DEBUG && targetEnvironment(simulator)
import SwiftUI

/// A minimal native-control reproduction for distinguishing SDK diagnostics from Shield's layout.
struct NativeAccessibilityReference: View {
    private var arguments: [String] { ProcessInfo.processInfo.arguments }
    @State private var sampleAlerts = false
    @State private var voiceOverRunning = UIAccessibility.isVoiceOverRunning

    var body: some View {
        TabView {
            Tab("Home", systemImage: "house") {
                NavigationStack {
                    List {
                        if arguments.contains("--native-voiceover-interaction") {
                            Text(voiceOverRunning ? "VoiceOver is running" : "VoiceOver is off")
                            Toggle("Allow sample alerts", isOn: $sampleAlerts).toggleStyle(.switch)
                        } else if arguments.contains("--native-footer-button") {
                            ForEach(1...10, id: \.self) { row($0) }
                            Button("All calls") {}
                                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                                .buttonStyle(.plain)
                                .accessibilityIdentifier("native-footer-button")
                        } else if arguments.contains("--native-stopped-card") {
                            StoppedCallsCard(count: 3) {}
                            ForEach(1...30, id: \.self) { row($0) }
                        } else if arguments.contains("--native-call-row") {
                            CallNavigationRow(call: PreviewAudio.call)
                        } else if arguments.contains("--native-message-row") {
                            MessageNavigationRow(call: PreviewAudio.call)
                        } else {
                            ForEach(1...30, id: \.self) { index in
                                if arguments.contains("--native-links") || arguments.contains("--native-labeled-links") {
                                    NavigationLink { Text("Native detail") } label: { row(index) }
                                } else { row(index) }
                            }
                        }
                    }
                    .modifier(ReferenceListStyle(enabled: arguments.contains("--native-shield-style")))
                    .navigationTitle("Native reference")
                    .navigationDestination(for: CallRecord.self) { _ in Text("Native detail") }
                    .toolbar {
                        if arguments.contains("--native-person-picker") {
                            ToolbarItem(placement: .topBarTrailing) { PersonPicker() }
                        }
                    }
                }
            }
            Tab("Calls", systemImage: "phone") { Text("Native calls") }
            Tab("Messages", systemImage: "tray") { Text("Native messages") }
            Tab("More", systemImage: "ellipsis") { Text("Native more") }
        }
        .tint(.blue)
        .demoAccessory(arguments.contains("--native-sample-marker"))
        .onReceive(NotificationCenter.default.publisher(for: UIAccessibility.voiceOverStatusDidChangeNotification)) { _ in
            voiceOverRunning = UIAccessibility.isVoiceOverRunning
        }
    }

    private func row(_ index: Int) -> some View {
        VStack(alignment: .leading) {
            Text("Native row \(index)")
            Text("Supporting text").font(.subheadline)
        }
        .modifier(ReferenceRowLabel(enabled: arguments.contains("--native-labeled-links"), index: index))
    }
}

private struct ReferenceRowLabel: ViewModifier {
    let enabled: Bool
    let index: Int
    @ViewBuilder func body(content: Content) -> some View {
        if enabled {
            content.accessibilityElement(children: .ignore)
                .accessibilityLabel("Native row \(index). Supporting text. Tuesday, October 13, 2026 at 5:00 PM.")
        } else { content }
    }
}

private struct ReferenceListStyle: ViewModifier {
    let enabled: Bool
    @ViewBuilder func body(content: Content) -> some View {
        if enabled { content.shieldListStyle() }
        else { content }
    }
}
#endif

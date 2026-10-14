import SwiftUI

@main
struct NativeBoundaryApp: App {
    var body: some Scene { WindowGroup { NativeBoundaryView() } }
}

struct NativeBoundaryView: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var opened = false
    private var variant: String {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--variant"), index + 1 < arguments.count else { return "stack" }
        return arguments[index + 1]
    }

    var body: some View {
        TabView {
            Tab("Home", systemImage: "house") {
                NavigationStack {
                    List {
                        Section {
                            Button {} label: {
                                VStack(alignment: .leading, spacing: 12) {
                                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                                        Text("Calls stopped").font(.title3.bold())
                                            .fixedSize(horizontal: false, vertical: true)
                                        Spacer(minLength: 0)
                                        Image(systemName: "hand.raised").font(.title3).accessibilityHidden(true)
                                    }
                                    if typeSize.isAccessibilitySize {
                                        total
                                        Text("Total").font(.body)
                                    } else {
                                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                                            total
                                            Text("Total").font(.body)
                                        }
                                    }
                                    HStack(spacing: 8) {
                                        Text("See calls").font(.headline)
                                        Image(systemName: "arrow.right").font(.body.weight(.semibold)).accessibilityHidden(true)
                                    }.padding(.top, typeSize.isAccessibilitySize ? 0 : 4)
                                }
                                .padding(.vertical, 12)
                                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                                .contentShape(.rect)
                            }.buttonStyle(.plain)
                                .accessibilityLabel("Calls stopped")
                                .accessibilityValue("3 in total")
                        }
                        Section {
                            record("Example message", detail: "Saved notice")
                            Button("All messages") {}
                                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                        } header: { Text("Messages").textCase(nil) }
                        Section {
                            record("Call stopped", detail: "Today")
                            record("Example reminder", detail: "Yesterday")
                            footer
                        } header: { Text("Recent calls").textCase(nil) }
                    }
                    .listStyle(.insetGrouped)
                    .listSectionSpacing(28)
                    .environment(\.defaultMinListRowHeight, 60)
                    .scrollContentBackground(.hidden)
                    .scrollEdgeEffectHidden(for: .all)
                    .background(Color(uiColor: .systemGroupedBackground))
                    .safeAreaPadding(.bottom, 16)
                    .padding(.vertical, 8)
                    .background(Color(uiColor: .systemGroupedBackground).ignoresSafeArea(.container, edges: .vertical))
                    .navigationTitle("Home")
                    .navigationDestination(isPresented: $opened) {
                        Text("Native footer action ran").navigationTitle("Calls")
                    }
                }
            }
            Tab("Calls", systemImage: "phone") { Text("Calls") }
            Tab("Messages", systemImage: "tray") { Text("Messages") }
            Tab("More", systemImage: "ellipsis") { Text("More") }
        }.tint(.primary)
    }

    private var total: some View {
        Text(3, format: .number)
            .font(Font.system(.largeTitle, design: .serif).scaled(by: 1.6)).monospacedDigit()
            .fixedSize(horizontal: false, vertical: true)
    }

    private func record(_ title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.body.weight(.semibold))
            Text(detail).font(.subheadline)
        }.padding(.vertical, 10)
    }

    @ViewBuilder private var footer: some View {
        if variant == "plain" {
            Button("All calls") { opened = true }
                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                .buttonStyle(.plain).accessibilityIdentifier("native-all-calls")
        } else if variant == "combined" {
            stackButton.accessibilityElement(children: .combine)
        } else { stackButton }
    }

    private var stackButton: some View {
        Button { opened = true } label: {
            HStack(spacing: 16) {
                if variant == "no-fixed" {
                    Text("All calls").font(.body.weight(.medium))
                } else {
                    Text("All calls").font(.body.weight(.medium))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.body.weight(.semibold)).accessibilityHidden(true)
            }
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
            .contentShape(.rect)
        }.buttonStyle(.plain).foregroundStyle(.primary)
            .accessibilityLabel("All calls")
            .accessibilityIdentifier("native-all-calls")
    }
}

import PhotosUI
import SwiftUI

struct CheckView: View {
    @Environment(AppState.self) private var model
    @State private var text = ""
    @State private var result: CheckResult?
    @State private var resultVersion = 0
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var checking = false
    @State private var readingPhoto = false
    @State private var showConsent = false
    @State private var error: String?
    @FocusState private var editing: Bool
    @AccessibilityFocusState private var resultFocused: Bool
    @ScaledMetric(relativeTo: .body) private var editorHeight = 120.0

    var body: some View {
            ScrollViewReader { proxy in
                List {
                    Section {
                        TextEditor(text: $text).frame(minHeight: editorHeight).focused($editing)
                            .accessibilityLabel("Text to check").disabled(checking || readingPhoto)
                            .overlay(alignment: .topLeading) {
                                if text.isEmpty {
                                    Text("Paste the message here…").fixedSize(horizontal: false, vertical: true).foregroundStyle(ShieldTheme.secondaryText).padding(.top, 8)
                                        .allowsHitTesting(false).accessibilityHidden(true)
                                }
                            }
                        ViewThatFits(in: .horizontal) {
                            HStack(spacing: 12) { inputActions }
                            VStack(alignment: .leading, spacing: 8) { inputActions }
                        }
                        .padding(.vertical, 4)
                    } header: { Text("Paste a text or choose a picture").foregroundStyle(ShieldTheme.secondaryText) } footer: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Leave out passwords and private numbers.").foregroundStyle(ShieldTheme.secondaryText)
                            if text.count > 6000 { Text("Too much text. Try a shorter part.").foregroundStyle(ShieldTheme.held) }
                        }
                        .foregroundStyle(ShieldTheme.secondaryText)
                    }
                    Section {
                        Button { editing = false; showConsent = true } label: {
                            ShieldActionLabel(title: checking ? "Checking…" : "Check this text", isWorking: checking)
                        }
                        .shieldPrimaryButton()
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).count < 3 || text.count > 6000 || checking || readingPhoto)
                        .alert("Check this text?", isPresented: $showConsent) {
                            Button(model.isDemo ? "Show sample answer" : "Check text") { Task { await check() } }
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            Text(model.isDemo ? "This shows a sample answer. Your text won’t be checked." : "This text goes to Shield and OpenAI for a scam check. Leave out passwords and codes.")
                        }
                        .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
                    }
                    if let error {
                        Section { ShieldNotice(title: "Couldn’t check this text", detail: error, symbol: "exclamationmark.circle") }
                    }
                    if let result {
                        Section {
                            VStack(alignment: .leading, spacing: 16) {
                                Label(result.isDemo ? "Sample answer" : "About this text", systemImage: "text.bubble")
                                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                                Label {
                                    Text(result.title).foregroundStyle(Color.primary)
                                } icon: {
                                    Image(systemName: result.decision == "refuse" ? "hand.raised.fill" : "info.circle.fill")
                                        .foregroundStyle(result.decision == "refuse" ? ShieldTheme.held : ShieldTheme.secondaryText)
                                }
                                .font(.title2.bold())
                                .accessibilityAddTraits(.isHeader)
                                .accessibilityFocused($resultFocused)
                                Text(result.detail)
                                Divider()
                                Text("What to do next").font(.headline)
                                Text(result.nextStep)
                            }.padding(.vertical, 12)
                                .id("check-result")
                            Button("Check another text", systemImage: "plus.bubble") { text = ""; self.result = nil; editing = true }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        } footer: { Text("This check can be wrong. It can’t prove who sent the text.").foregroundStyle(ShieldTheme.secondaryText) }
                        if model.isOwner {
                            Section { NavigationLink(value: AppRoute.savedNumbers) { ActionRow(title: "Find a trusted number", symbol: "phone") } }
                        }
                    }
                }
                .navigationTitle("Check a text")
                .toolbar { ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { editing = false } } }
                .task(id: selectedPhoto) { await readPhoto() }
                .onChange(of: text) { _, _ in result = nil; error = nil }
                .scrollDismissesKeyboard(.interactively)
                .shieldListStyle()
                .sensoryFeedback(trigger: resultVersion) { _, _ in result?.decision == "refuse" ? .warning : .success }
                .task(id: resultVersion) {
                    guard !checking, result != nil, error == nil else { return }
                    proxy.scrollTo("check-result", anchor: .top)
                    resultFocused = true
                }
            }
    }

    @ViewBuilder private var inputActions: some View {
        PasteButton(payloadType: String.self) { values in text = values.joined(separator: "\n") }
            .tint(ShieldTheme.pasteFill).buttonBorderShape(.capsule)
            .disabled(checking || readingPhoto)
        PhotosPicker(selection: $selectedPhoto, matching: .images) { [readingPhoto] in
            Label(readingPhoto ? "Reading…" : "Picture", systemImage: "photo")
        }
        .buttonStyle(.bordered).buttonBorderShape(.capsule)
        .tint(ShieldTheme.action)
        .disabled(readingPhoto || checking)
    }

    private func readPhoto() async {
        guard let selectedPhoto else { return }
        error = nil
        readingPhoto = true
        defer { readingPhoto = false }
        do {
            guard let bytes = try await selectedPhoto.loadTransferable(type: Data.self) else { throw ImageTextExtractionError.unreadable }
            text = try await ImageTextExtractor.text(from: bytes)
            result = nil
        } catch { report(error) }
    }

    private func report(_ error: Error) {
        self.error = error.localizedDescription
        if case let APIError.service(_, status) = error, status == 401 || status == 403 { model.handle(error) }
    }

    private func check() async {
        error = nil
        checking = true
        resultFocused = false
        defer { checking = false }
        if model.isDemo {
            result = CheckResult(decision: "message", reasonCode: "sample", title: "Check with the sender",
                                 detail: "This is an example. Your text hasn’t been checked.",
                                 nextStep: "Use a number you already know to check with the sender.", isDemo: true)
            resultVersion += 1
            return
        }
        do {
            result = try await model.api.send("/api/check", method: "POST",
                body: APIClient.payload(["text": text, "analysisConsent": true]))
            resultVersion += 1
        } catch { report(error) }
    }
}

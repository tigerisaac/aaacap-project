import PhotosUI
import SwiftUI

struct CheckView: View {
    @Environment(AppState.self) private var model
    @State private var text = ""
    @State private var result: CheckResult?
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var checking = false
    @State private var readingPhoto = false
    @State private var showConsent = false
    @FocusState private var editing: Bool

    var body: some View {
        NavigationShell {
            List {
                Section {
                    TextEditor(text: $text)
                        .frame(minHeight: 160)
                        .focused($editing)
                        .accessibilityLabel("Text to check")
                        .overlay(alignment: .topLeading) {
                            if text.isEmpty {
                                Text("Paste the message here…")
                                    .foregroundStyle(.secondary)
                                    .padding(.top, 8)
                                    .allowsHitTesting(false)
                                    .accessibilityHidden(true)
                            }
                        }
                    PhotosPicker(selection: $selectedPhoto, matching: .images) { [readingPhoto] in
                        Label(readingPhoto ? "Reading screenshot…" : "Read a screenshot", systemImage: "photo")
                            .frame(minHeight: 44)
                    }
                    .disabled(readingPhoto || checking)
                } footer: {
                    Text("Screenshot text is read on your phone. Remove private details before checking.")
                }
                Section {
                    Button {
                        editing = false
                        showConsent = true
                    } label: {
                        HStack {
                            if checking { ProgressView() }
                            Label(checking ? "Checking…" : "Check message", systemImage: "sparkle.magnifyingglass")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).count < 3 || text.count > 6000 || checking)
                    .confirmationDialog("Send this text for analysis?", isPresented: $showConsent, titleVisibility: .visible) {
                        Button(model.isDemo ? "Show sample result" : "Analyze with OpenAI") { Task { await check() } }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text(model.isDemo ? "Demo checks use a sample response." : "Only this text is sent. Do not include passwords, codes, or account numbers.")
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
                if let result {
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            Label(result.title, systemImage: result.decision == "refuse" ? "hand.raised.fill" : "info.circle.fill")
                                .font(.title3.bold())
                                .foregroundStyle(result.decision == "refuse" ? ShieldTheme.held : ShieldTheme.action)
                            Text(result.detail)
                            Text(result.nextStep).fontWeight(.medium)
                        }
                        .padding(.vertical, 10)
                    } footer: {
                        Text("A check can miss a scam. It cannot verify who sent this.")
                    }
                    if model.isOwner {
                        NavigationLink(value: AppRoute.savedNumbers) { Label("Use a saved number", systemImage: "phone") }
                    }
                }
            }
            .navigationTitle("Check")
            .task(id: selectedPhoto) { await readPhoto() }
            .scrollContentBackground(.hidden)
            .background(ShieldTheme.surface)
        }
    }

    private func readPhoto() async {
        guard let selectedPhoto else { return }
        readingPhoto = true
        defer { readingPhoto = false }
        do {
            guard let bytes = try await selectedPhoto.loadTransferable(type: Data.self) else { throw APIError.invalidResponse }
            text = try await ImageTextExtractor.text(from: bytes)
            result = nil
        } catch { model.handle(error) }
    }

    private func check() async {
        checking = true
        defer { checking = false }
        if model.isDemo {
            result = CheckResult(decision: "message", reasonCode: "sample", title: "Check independently",
                                 detail: "This is a sample result, not an analysis of your message.",
                                 nextStep: "Contact the sender through a number or app you already trust.", isDemo: true)
            return
        }
        do {
            result = try await model.api.send("/api/check", method: "POST",
                body: APIClient.payload(["text": text, "analysisConsent": true]))
        } catch { model.handle(error) }
    }
}

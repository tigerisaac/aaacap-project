import XCTest

/// Audits real VoiceOver focus and speech, then verifies each focused action with direct UI automation.
/// Native simulator VoiceOver gestures are not certified by this helper.
@available(iOS 27.0, *)
@MainActor
final class VoiceOverWalkthrough {
    let app: XCUIApplication
    private let test: XCTestCase
    private let service = XCUIDevice.shared.voiceOverService
    private let name: String
    private var record = [[String: String]]()
    private var current = ""

    init(_ test: XCTestCase, name: String, arguments: [String], large: Bool = false) throws {
        self.test = test; self.name = name
        try service.disable()
        app = XCUIApplication()
        app.launchArguments = ["--uitesting-light"] + arguments + (large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : [])
        app.launch()
        try service.enable()
        XCTAssertTrue(service.isEnabled)
    }

    func find(_ label: String, where matches: (String) -> Bool = { _ in true }) throws {
        for forward in [true, false] {
            for page in 0..<8 {
                if let output = try? service.currentSpeech() {
                    current = output.utterance
                    log("current", current)
                    if current.contains(label) && matches(current) { return }
                }
                var repeats = 0
                for _ in 0..<100 {
                    do {
                        // Re-enabling at a new page starts at its first item, including when paging upward.
                        let output = try service.moveForward()
                        let utterance = output.utterance
                        log("next", utterance)
                        repeats = utterance == current ? repeats + 1 : 0
                        current = utterance
                        if current.contains(label) && matches(current) { return }
                        if repeats == 2 { break }
                    } catch let error as NSError where error.domain == XCUIVoiceOverServiceErrorDomain && error.code == 3 {
                        break
                    }
                }
                guard page < 7, try turnPage(forward: forward) else { break }
            }
        }
        throw NSError(domain: "ShieldVoiceOverWalkthrough", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "VoiceOver could not reach \(label). Last speech: \(current)"])
    }

    private func turnPage(forward: Bool) throws -> Bool {
        let list = app.collectionViews.firstMatch
        let scroll = list.exists ? list : app.scrollViews.firstMatch
        guard scroll.exists else { return false }
        func signature() -> String {
            if list.exists {
                return list.cells.allElementsBoundByIndex.filter(\.isHittable)
                    .map { "\($0.label) \($0.frame)" }.joined(separator: "\n")
            }
            return app.staticTexts.allElementsBoundByIndex.filter(\.isHittable)
                .map { "\($0.label) \($0.frame)" }.joined(separator: "\n")
        }
        let before = signature()
        try service.disable()
        log("direct-scroll-with-VoiceOver-disabled", forward ? "Next page" : "Previous page")
        if forward { scroll.swipeUp() } else { scroll.swipeDown() }
        try service.enable()
        return before != signature()
    }

    func activate(_ label: String, where matches: (String) -> Bool = { _ in true }) throws {
        try find(label, where: matches)
        log("activate", current)
        // Resolve the spoken focus through accessibility metadata, without a visual target.
        // The simulator cannot reliably activate even a bare native switch with VoiceOver on.
        // Record this boundary: focus is audited with VoiceOver; action is tested with it disabled.
        let target: XCUIElement
        if current.localizedCaseInsensitiveContains("back button") {
            target = app.navigationBars.buttons.firstMatch
        } else if current.localizedCaseInsensitiveContains(" tab ") {
            target = app.tabBars.buttons[label]
        } else if current.localizedCaseInsensitiveContains("text field") {
            target = app.textFields[label]
        } else if current.localizedCaseInsensitiveContains("text view") {
            target = app.textViews[label]
        } else if current.localizedCaseInsensitiveContains("switch") {
            target = app.switches[label]
        } else if current.localizedCaseInsensitiveContains("link") {
            target = app.links[label]
        } else {
            target = app.buttons[label]
        }
        guard target.exists else {
            throw NSError(domain: "ShieldVoiceOverWalkthrough", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "No control matches spoken focus: \(current)"])
        }
        let targetLabel = target.label
        let targetType = target.elementType
        try service.disable()
        log("direct-action-with-VoiceOver-disabled", targetLabel)
        // Requery after the mode change, since adaptive controls may move into the reading flow.
        let directQuery = current.localizedCaseInsensitiveContains("back button") ? app.navigationBars.buttons
            : current.localizedCaseInsensitiveContains(" tab ") ? app.tabBars.buttons
            : app.descendants(matching: targetType)
        let direct = directQuery.matching(NSPredicate(format: "label == %@", targetLabel)).firstMatch
        if targetType == .switch {
            // Native Switch accessibility frames can include their non-tappable label.
            direct.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        } else { direct.tap() }
        try service.enable()
    }

    func enter(_ label: String, text: String) throws {
        try activate(label, where: { $0.localizedCaseInsensitiveContains("text field") || $0.localizedCaseInsensitiveContains("text view") })
        app.typeText(text)
        log("type", "Synthetic text in \(label)")
    }

    func checkpoint(_ suffix: String) {
        let speech = XCTAttachment(string: (try? service.currentSpeech().utterance) ?? "No current speech")
        speech.name = "voiceover-\(name)-\(suffix)-focus"; speech.lifetime = .keepAlways; test.add(speech)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = "voiceover-\(name)-\(suffix)-tree"; tree.lifetime = .keepAlways; test.add(tree)
        let screen = XCTAttachment(screenshot: app.screenshot())
        screen.name = "voiceover-\(name)-\(suffix)"; screen.lifetime = .keepAlways; test.add(screen)
    }

    func finish() {
        if let data = try? JSONSerialization.data(withJSONObject: record, options: [.prettyPrinted, .sortedKeys]),
           let text = String(data: data, encoding: .utf8) {
            let evidence = XCTAttachment(string: text)
            evidence.name = "voiceover-\(name)-speech-and-actions"; evidence.lifetime = .keepAlways; test.add(evidence)
        }
        do { try service.disable(); XCTAssertFalse(service.isEnabled) }
        catch { XCTFail("VoiceOver could not be restored: \(error)") }
    }

    private func log(_ action: String, _ utterance: String) {
        record.append(["action": action, "utterance": utterance])
        print("Shield VoiceOver \(name) \(action): \(utterance)")
    }

}

import XCTest

@MainActor
final class SeniorAccessibilityUITests: XCTestCase {
    override func setUp() { continueAfterFailure = true }

    func testWelcomeAndSentEmailAudit() throws {
        var app = launch(["--uitesting-auth-error"])
        XCTAssertTrue(app.textFields["Email address"].appears(timeout: 5))
        try audit(app, "accessibility-welcome")
        app = launch(["--uitesting-email-sent"])
        XCTAssertTrue(app.staticTexts["Check your email"].appears(timeout: 5))
        try audit(app, "accessibility-email-sent")
    }

    func testEverydayScreensAudit() throws {
        let app = launch(["--uitesting-preview"])
        try audit(app, "accessibility-home")
        moveFullyIntoView(app.historyRow("Call stopped"), in: app)
        try audit(app, "accessibility-home-row-exposed")
        app.tabBars.buttons["Calls"].tap()
        try audit(app, "accessibility-calls")
        moveFullyIntoView(app.historyRow("Suspicious message removed"), in: app)
        try audit(app, "accessibility-calls-row-exposed")
        app.tabBars.buttons["Messages"].tap()
        try audit(app, "accessibility-messages")
        app.tabBars.buttons["More"].tap()
        try audit(app, "accessibility-more")
    }

    func testOwnerSettingsScreensAudit() throws {
        for screen in ["numbers", "add-number", "sharing", "contacts", "quiet", "blocked", "protection", "help", "automatic-texts"] {
            let app = launch(["--uitesting-screen", screen])
            try audit(app, "accessibility-\(screen)")
        }
    }

    func testContactsAndCaretakersStandardLightAudit() throws {
        try auditContactsAndCaretakers(largestDark: false)
    }

    func testContactsAndCaretakersLargestDarkAudit() throws {
        try auditContactsAndCaretakers(largestDark: true)
    }

    func testFullyExposedAddCaretakerAtLargestTextAudit() throws {
        try auditExposedContactLabel(screen: "trusted-contacts", label: "Add caretaker")
    }

    func testFullyExposedTextAlertsAtLargestTextAudit() throws {
        try auditExposedContactLabel(screen: "contact-alerts", label: "Text messages")
    }

    func testFullyExposedPendingSharingAtLargestTextAudit() throws {
        try auditExposedContactLabel(screen: "sharing-access", label: "Waiting for them to join")
    }

    func testEnabledContactRemovalStandardLightAudit() throws {
        let app = launch(["--uitesting-screen", "contacts", "--uitesting-contact-removal"])
        let removal = app.buttons["Remove Jamie from Contacts"]
        XCTAssertTrue(removal.appears(timeout: 5))
        XCTAssertTrue(removal.isEnabled)
        exposeContactElement(removal, in: app)
        try audit(app, "contact-contrast-enabled-removal")
    }

    func testEmptyFamilyGuidanceAtStandardTextAudit() throws {
        try auditEmptyFamilyGuidance(largestDark: false)
    }

    func testEmptyEverydayGuidanceAtStandardTextAudit() throws {
        try auditEmptyEverydayGuidance(largestDark: false)
    }

    func testEmptyEverydayGuidanceAtLargestTextAudit() throws {
        try auditEmptyEverydayGuidance(largestDark: true)
    }

    private func auditEmptyEverydayGuidance(largestDark: Bool) throws {
        for (screen, detail) in [
            ("calls", "Calls that reach Shield will appear here."),
            ("messages", "Voicemail and saved notices will appear here."),
            ("numbers", "Save a number from a card, bill, or official website."),
            ("blocked", "Numbers blocked by Shield will appear here."),
            ("contacts", "Share your contacts once, or add a contact with the Add button."),
            ("phone-setup", "Phone setup is done with a helper, one step at a time. The sample app doesn’t change your phone.")
        ] {
            let app = launch(["--uitesting-screen", screen, "--uitesting-empty-data", "--uitesting-single-person",
                              "--uitesting-calls-state", "empty", "--uitesting-message-filters",
                              "-UIPreferredContentSizeCategoryName",
                              largestDark ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"], dark: largestDark)
            if largestDark {
                let title = app.staticTexts["empty-state-title"].firstMatch
                exposeEverydayGuidance(title, in: app)
                let capture = XCTAttachment(screenshot: app.screenshot())
                capture.name = "empty-everyday-\(screen)-largest-dark-title"; capture.lifetime = .keepAlways; add(capture)
            }
            let guidance = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", detail)).firstMatch
            exposeEverydayGuidance(guidance, in: app, bottomEdge: largestDark ? false : nil)
            guard guidance.exists else { continue }
            let name = "empty-everyday-\(screen)-\(largestDark ? "largest-dark" : "standard-light")"
            let bounds = everydayGuidanceBounds(in: app)
            if largestDark && guidance.frame.height > bounds.upperBound - bounds.lowerBound {
                try audit(app, name + "-start")
                exposeEverydayGuidance(guidance, in: app, bottomEdge: true)
                try audit(app, name + "-end")
            } else {
                if largestDark { exposeEverydayGuidance(guidance, in: app) }
                try audit(app, name)
            }
        }
    }

    private func exposeEverydayGuidance(_ element: XCUIElement, in app: XCUIApplication, bottomEdge: Bool? = nil) {
        for _ in 0..<24 {
            let bounds = everydayGuidanceBounds(in: app)
            var delta: CGFloat = 0.12
            if element.exists {
                let frame = element.frame
                let edge = bottomEdge.map { $0 ? frame.maxY : frame.minY }
                if let edge {
                    if bounds.contains(edge) { break }
                    delta = (edge - (edge < bounds.lowerBound ? bounds.lowerBound : bounds.upperBound)) / app.frame.height
                } else {
                    if bounds.contains(frame.minY), bounds.contains(frame.maxY) { break }
                    delta = (frame.minY < bounds.lowerBound ? frame.minY - bounds.lowerBound : frame.maxY - bounds.upperBound) / app.frame.height
                }
            }
            let distance = min(max(abs(delta), 0.06), 0.18) * (delta < 0 ? -1 : 1)
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55 - distance)))
        }
        let bounds = everydayGuidanceBounds(in: app)
        let top = bounds.lowerBound
        let bottom = bounds.upperBound
        XCTAssertTrue(element.exists)
        guard element.exists else { return }
        XCTAssertTrue(element.isHittable)
        if let bottomEdge {
            let edge = bottomEdge ? element.frame.maxY : element.frame.minY
            XCTAssertGreaterThanOrEqual(edge, top)
            XCTAssertLessThanOrEqual(edge, bottom)
        } else {
            XCTAssertGreaterThanOrEqual(element.frame.minY, top)
            XCTAssertLessThanOrEqual(element.frame.maxY, bottom)
        }
        let edgeName = bottomEdge.map { $0 ? "end" : "start" } ?? "whole paragraph"
        let geometry = XCTAttachment(string: "Target: \(element.label)\nFrame: \(element.frame)\nEdge: \(edgeName)\nUsable vertical bounds: \(top)...\(bottom)")
        geometry.name = "empty-guidance-edge-geometry"; geometry.lifetime = .keepAlways; add(geometry)
    }

    private func everydayGuidanceBounds(in app: XCUIApplication) -> ClosedRange<CGFloat> {
        // Search hides the navigation bar. Lists also collapse large titles while scrolling,
        // so measure the current chrome rather than retaining the launch-time bar height.
        let list = app.collectionViews.firstMatch
        var top = list.exists ? list.frame.minY : app.frame.minY + 60
        let navigationBar = app.navigationBars.firstMatch
        if navigationBar.exists { top = max(top, navigationBar.frame.maxY) }
        // The 375×667 SE fixture has a physical Home button, so no in-app indicator overlaps it.
        let homeButtonFixture = app.frame.size == CGSize(width: 375, height: 667)
        var bottom = app.frame.maxY - (homeButtonFixture ? 0 : 34)
        for control in [app.tabBars.firstMatch, app.searchFields.firstMatch] where control.exists {
            let frame = control.frame
            if frame.intersects(app.frame) {
                if frame.midY > app.frame.midY { bottom = min(bottom, frame.minY) }
                else { top = max(top, frame.maxY) }
            }
        }
        return (top + 8)...(bottom - 8)
    }

    func testEmptyContactSearchAtStandardTextAudit() throws {
        try auditEmptyContactSearch(largestDark: false)
    }

    func testEmptyContactSearchAtLargestTextAudit() throws {
        try auditEmptyContactSearch(largestDark: true)
    }

    private func auditEmptyContactSearch(largestDark: Bool) throws {
        let app = launch(["--uitesting-screen", "contacts", "--uitesting-single-person",
                          "-UIPreferredContentSizeCategoryName",
                          largestDark ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"], dark: largestDark)
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.appears(timeout: 5))
        search.tap(); search.typeText("NoMatchingPerson")
        app.keyboards.buttons["Search"].tap()
        let title = app.staticTexts["empty-state-title"].firstMatch
        exposeEverydayGuidance(title, in: app)
        XCTAssertEqual(title.label, "No matching contacts")
        XCTAssertFalse(app.staticTexts["Jamie"].exists)
        if largestDark {
            let capture = XCTAttachment(screenshot: app.screenshot())
            capture.name = "empty-everyday-contacts-search-largest-dark-title"; capture.lifetime = .keepAlways; add(capture)
        }
        let guidance = app.staticTexts["Try another name or number."].firstMatch
        exposeEverydayGuidance(guidance, in: app)
        try audit(app, "empty-everyday-contacts-search-\(largestDark ? "largest-dark" : "standard-light")")
    }

    func testEmptyFamilyGuidanceAtLargestTextAudit() throws {
        try auditEmptyFamilyGuidance(largestDark: true)
    }

    func testEmptyIncomingCaretakerGuidanceAtStandardTextAudit() throws {
        let app = launch(["--uitesting-screen", "contact-alerts", "--uitesting-alert-requests-empty",
                          "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryL"])
        let guidance = app.staticTexts["When someone adds you as a caretaker, their request appears here. They need the mobile number you use to sign in."]
        XCTAssertTrue(guidance.appears(timeout: 5))
        exposeContactElement(guidance, in: app)
        try audit(app, "empty-family-contact-alerts-standard-light")
    }

    private func auditEmptyFamilyGuidance(largestDark: Bool) throws {
        for (screen, detail) in [
            ("sharing", "No one has shared access to your calls or messages."),
            ("trusted-contacts", "You can keep using Shield without a caretaker.")
        ] {
            let app = launch(["--uitesting-screen", screen, "--uitesting-caretakers-unavailable",
                              "-UIPreferredContentSizeCategoryName",
                              largestDark ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"],
                             dark: largestDark)
            let text = app.staticTexts[detail].firstMatch
            XCTAssertTrue(text.appears(timeout: 5))
            exposeContactElement(text, in: app)
            try audit(app, "empty-family-\(screen)-\(largestDark ? "largest-dark" : "standard-light")")
        }
    }

    private func auditExposedContactLabel(screen: String, label: String) throws {
        let app = launch(["--uitesting-screen", screen,
                          "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], dark: true)
        let text = app.staticTexts[label].firstMatch
        XCTAssertTrue(text.appears(timeout: 5))
        exposeContactElement(text, in: app)
        try audit(app, "contact-contrast-exposed-\(screen)")
    }

    private func exposeContactElement(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<24 {
            let top = app.navigationBars.firstMatch.frame.maxY + 20
            let bottom = app.frame.maxY - 120
            if element.exists, element.isHittable, element.frame.minY >= top, element.frame.maxY <= bottom { break }
            let down = element.exists && !element.frame.isEmpty && element.frame.minY < top
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.42 : 0.64))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.64 : 0.42)))
        }
        let top = app.navigationBars.firstMatch.frame.maxY + 20
        let bottom = app.frame.maxY - 120
        XCTAssertTrue(element.isHittable)
        XCTAssertGreaterThanOrEqual(element.frame.minY, top)
        XCTAssertLessThanOrEqual(element.frame.maxY, bottom)
        let geometry = XCTAttachment(string: "Target: \(element.label)\nFrame: \(element.frame)\nUsable vertical bounds: \(top)...\(bottom)\nEnabled: \(element.isEnabled)")
        geometry.name = "contact-contrast-target-geometry"; geometry.lifetime = .keepAlways; add(geometry)
    }

    private func auditContactsAndCaretakers(largestDark: Bool) throws {
        for screen in ["contacts", "trusted-contacts", "contact-alerts", "sharing-access"] {
            var arguments = ["--uitesting-screen", screen]
            if largestDark { arguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] }
            let app = launch(arguments, dark: largestDark)
            let name = "release-sharing-\(screen)-\(largestDark ? "largest-dark" : "standard-light")"
            try audit(app, name)
            app.swipeUp()
            try audit(app, name + "-scrolled")
        }
    }

    func testSwitchLabelsAtStandardAndLargestText() throws {
        for dark in [false, true] {
            for largest in [false, true] {
                for (screen, label) in [("quiet", "Quiet hours"), ("protection", "Check calls while I talk")] {
                    var arguments = ["--uitesting-preview", "--uitesting-screen", screen]
                    if largest {
                        arguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
                    }
                    let app = launch(arguments, dark: dark)
                    let toggle = app.switches[label].firstMatch
                    XCTAssertTrue(toggle.appears(timeout: 5))
                    XCTAssertEqual(toggle.isEnabled, screen == "quiet")
                    XCTAssertGreaterThanOrEqual(toggle.frame.height, 52)
                    try audit(app, "switch-\(screen)-\(dark ? "dark" : "light")-\(largest ? "largest" : "standard")", types: .textClipped)
                }
            }
        }
    }

    func testOnboardingChoicesAudit() throws {
        var app = launch(["--uitesting-protection-onboarding"])
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].appears(timeout: 5))
        try audit(app, "accessibility-protection-choice")
        app = launch(["--uitesting-trusted-contacts"])
        XCTAssertTrue(app.buttons["trusted-contact-no"].appears(timeout: 5))
        try audit(app, "accessibility-helper-choice")
    }

    func testPhoneSetupAndDisconnectionAudit() throws {
        var app = launch(["--uitesting-forwarding"])
        XCTAssertTrue(app.buttons["forwarding-continue"].appears(timeout: 5))
        try audit(app, "accessibility-phone-setup")
        app = launch(["--uitesting-forwarding", "--forwarding-start-restore"])
        XCTAssertTrue(app.buttons["disconnect-continue"].appears(timeout: 5))
        try audit(app, "accessibility-disconnection")
    }

    func testNativeControlReferenceAudit() throws {
        let app = launch(["--uitesting-native-reference"])
        try audit(app, "accessibility-native-control-reference")
    }

    func testNativeControlDiagnosticIsolation() throws {
        for (name, argument) in [("person", "--native-person-picker"), ("marker", "--native-sample-marker"), ("style", "--native-shield-style")] {
            let app = launch(["--uitesting-native-reference", "--uitesting-preview", argument])
            try audit(app, "accessibility-native-\(name)-reference")
        }
    }

    func testNativeNavigationLinkDiagnosticIsolation() throws {
        for (name, argument) in [("links", "--native-links"), ("labeled-links", "--native-labeled-links")] {
            let app = launch(["--uitesting-native-reference", argument])
            try audit(app, "accessibility-native-\(name)-reference")
        }
    }

    func testNativeHistoryRowDiagnosticIsolation() throws {
        for (name, argument) in [("call-row", "--native-call-row"), ("message-row", "--native-message-row")] {
            let app = launch(["--uitesting-native-reference", argument])
            try audit(app, "accessibility-native-\(name)-reference")
        }
    }

    func testNativeStoppedCardDiagnosticIsolation() throws {
        let app = launch(["--uitesting-native-reference", "--native-stopped-card"])
        try audit(app, "accessibility-native-stopped-card-reference")
        app.swipeUp()
        try audit(app, "accessibility-native-stopped-card-scrolled-reference")
    }

    func testDarkToolbarActionsAudit() throws {
        for screen in ["add-number", "add-contact"] {
            let app = launch(["--uitesting-screen", screen], dark: true)
            try audit(app, "accessibility-\(screen)-dark")
        }
        var app = launch(["--uitesting-forwarding"], dark: true)
        try audit(app, "accessibility-phone-setup-dark")
        app = launch(["--uitesting-forwarding", "--forwarding-start-restore"], dark: true)
        try audit(app, "accessibility-disconnection-dark")
    }

    func testNativeFooterClippingDiagnostic() throws {
        let app = launch(["--uitesting-native-reference", "--native-footer-button"])
        for _ in 0..<3 { app.swipeUp() }
        XCTAssertTrue(app.buttons["native-footer-button"].isHittable)
        try audit(app, "clipping-native-footer", types: .textClipped)
    }

    // Optional standalone SwiftUI app: no Shield views, colors or application state.
    // Install the diagnostic fixture and set its bundle ID in the test runner environment.
    func testExternalNativeBoundaryClippingReference() throws {
        guard let bundleID = ProcessInfo.processInfo.environment["SHIELD_NATIVE_BOUNDARY_BUNDLE"] else {
            throw XCTSkip("Standalone native boundary fixture is not installed for this run.")
        }
        for variant in ["plain", "stack", "no-fixed", "combined"] {
            let app = XCUIApplication(bundleIdentifier: bundleID)
            app.launchArguments = ["--variant", variant]
            app.launch()
            try audit(app, "external-native-\(variant)-initial", types: .textClipped)
            app.swipeUp()
            try audit(app, "external-native-\(variant)-scrolled", types: .textClipped)
            let footer = app.buttons["native-all-calls"]
            XCTAssertTrue(footer.isHittable)
            footer.tap()
            XCTAssertTrue(app.staticTexts["Native footer action ran"].appears(timeout: 5))
            app.terminate()
        }
    }

    private func launch(_ arguments: [String], dark: Bool = false) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = [dark ? "--uitesting-dark" : "--uitesting-light"] + arguments
        app.launch()
        return app
    }

    private func audit(_ app: XCUIApplication, _ name: String,
                       types: XCUIAccessibilityAuditType = [.contrast, .textClipped, .hitRegion, .sufficientElementDescription]) throws {
        // Without this settle, edge-row issues come back without an associated element.
        Thread.sleep(forTimeInterval: 0.8)
        let screenshot = app.screenshot()
        let capture = XCTAttachment(screenshot: screenshot)
        capture.name = name; capture.lifetime = .keepAlways; add(capture)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = "\(name)-accessibility-tree"; tree.lifetime = .keepAlways; add(tree)
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("AccessibilityScreens")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try screenshot.pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
        // Keep every diagnostic. Review native scroll-edge/disabled-control reports against the capture.
        try app.performAccessibilityAudit(for: types) { issue in
            print("Shield accessibility: \(name): \(issue.compactDescription); \(issue.element?.debugDescription ?? "No associated element"); Details: \(issue.detailedDescription)")
            // The whole tree is already attached once above; keep only this element's subtree and path.
            let evidence = XCTAttachment(string: "\(issue.compactDescription)\n\(issue.detailedDescription)\n\(issue.element?.debugDescription ?? "No associated element")")
            evidence.name = "\(name)-audit-details"; evidence.lifetime = .keepAlways; self.add(evidence)
            return false
        }
    }

    private func moveFullyIntoView(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<8 {
            if element.exists && element.frame.minY >= app.navigationBars.firstMatch.frame.maxY && element.frame.maxY <= app.tabBars.firstMatch.frame.minY { return }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable)
    }
}

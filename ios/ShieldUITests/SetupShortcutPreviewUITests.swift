import XCTest

@MainActor
final class SetupShortcutPreviewUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testReturnRequiresConfirmationAndAllowsReopening() {
        let app = preview(["--shortcut-already-added"])
        capture(app, "Shortcut ready")
        XCTAssertFalse(app.buttons["setup-guide-playback"].exists)
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["Is Live Voicemail off?"].appears(timeout: 5))
        XCTAssertFalse(app.staticTexts["That’s the phone change"].exists)
        capture(app, "Shortcut return is unconfirmed")
        reveal(app.buttons["setup-shortcut-reopen"], app: app)
        app.buttons["setup-shortcut-reopen"].tap()
        XCTAssertEqual(primary(app).label, "Live Voicemail is off")
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["That’s the phone change"].exists)
        XCTAssertTrue(app.staticTexts["This trial hasn’t changed your carrier forwarding."].exists)
        capture(app, "Shortcut local confirmation")
    }

    func testUnavailableShortcutsDoesNotConfirmAnything() {
        let app = preview(["--shortcut-already-added", "--shortcut-open-fails"])
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["setup-shortcut-error"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Open Phone settings")
        XCTAssertFalse(app.staticTexts["Is Live Voicemail off?"].exists)
        app.buttons["Need help?"].tap()
        reveal(app.buttons["setup-shortcut-add-again"], app: app)
        XCTAssertTrue(app.buttons["Use the step-by-step guide"].exists)
        capture(app, "Shortcut unavailable recovery")
    }

    func testLargestTextFloatingFailureKeepsFallbackReachable() {
        let app = preview(["--shortcut-already-added", "--setup-guide-unavailable", "--uitesting-dark",
                           "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Shortcut largest text top")
        reveal(primary(app), app: app)
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["setup-shortcut-error"].appears(timeout: 5))
        reveal(primary(app), app: app)
        XCTAssertEqual(primary(app).label, "Open Settings anyway")
        capture(app, "Shortcut largest text fallback")
        primary(app).tap()
        reveal(primary(app), app: app)
        XCTAssertEqual(primary(app).label, "Live Voicemail is off")
        XCTAssertFalse(app.staticTexts["That’s the phone change"].exists)
        capture(app, "Shortcut largest text unconfirmed return")
    }

    func testNativeImportCanBeReviewedWithoutRunning() {
        let shortcuts = XCUIApplication(bundleIdentifier: "com.apple.shortcuts")
        shortcuts.terminate()
        let app = preview()
        capture(app, "Shortcut add helper")
        primary(app).tap()
        let destination = app.cells["Shortcuts"].firstMatch
        XCTAssertTrue(destination.appears(timeout: 10))
        destination.tap()
        let addShortcut = shortcuts.buttons["Add Shortcut"]
        XCTAssertTrue(addShortcut.appears(timeout: 15))
        capture(shortcuts, "Native four action Add Shortcut")
        // Do not add or execute telephony actions in a simulator test.
        app.activate()
        XCTAssertEqual(primary(app).label, "Open Phone settings")
        XCTAssertFalse(app.staticTexts["Is Live Voicemail off?"].exists)
        XCTAssertFalse(app.staticTexts["That’s the phone change"].exists)
    }

    private func preview(_ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--uitesting-shortcut-preview"] + extra
        app.launch()
        XCTAssertTrue(primary(app).appears(timeout: 10))
        return app
    }

    private func primary(_ app: XCUIApplication) -> XCUIElement { app.buttons["setup-shortcut-primary"] }

    private func reveal(_ target: XCUIElement, app: XCUIApplication) {
        for _ in 0..<12 {
            let top = app.navigationBars.firstMatch.frame.maxY
            if target.isHittable && target.frame.minY >= top && target.frame.maxY < app.frame.maxY - 30 { return }
            if target.exists && target.frame.minY < top { app.swipeDown() } else { app.swipeUp() }
        }
        XCTAssertTrue(target.isHittable)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        // Let native label transitions settle before making review evidence.
        Thread.sleep(forTimeInterval: 0.8)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

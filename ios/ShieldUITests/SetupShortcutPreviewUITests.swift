import XCTest

@MainActor
final class SetupShortcutPreviewUITests: XCTestCase {
    private func preview(_ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--uitesting-shortcut-preview"] + extra
        app.launch()
        return app
    }

    func testNativeImportCanBeReviewedWithoutRunningTheAction() {
        continueAfterFailure = false
        let app = preview()
        let addFile = app.buttons["setup-shortcut-add"]
        XCTAssertTrue(addFile.waitForExistence(timeout: 10))
        addFile.tap()
        let shortcutsDestination = app.cells["Shortcuts"].firstMatch
        XCTAssertTrue(shortcutsDestination.waitForExistence(timeout: 8))
        let menu = XCTAttachment(screenshot: app.screenshot())
        menu.name = "Restricted native Open In menu"
        menu.lifetime = .keepAlways
        add(menu)
        shortcutsDestination.tap()
        let shortcuts = XCUIApplication(bundleIdentifier: "com.apple.shortcuts")
        let importAction = shortcuts.buttons["Add Shortcut"]
        let canAdd = importAction.waitForExistence(timeout: 12)
        let attachment = XCTAttachment(screenshot: shortcuts.screenshot())
        attachment.name = "Native import of authored single-action shortcut"
        attachment.lifetime = .keepAlways
        add(attachment)
        XCTAssertTrue(canAdd, "The native import must offer Add Shortcut before this is usable in setup")
        // Deliberately leave Add/Run untouched. This test only reviews the file.
        app.activate()
        XCTAssertTrue(app.buttons["setup-shortcut-run"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.cells["Shortcuts"].firstMatch.exists, "Returning must not reopen the chooser")
        XCTAssertFalse(app.staticTexts["setup-shortcut-result"].exists, "Import is not a completed action")
    }

    func testUnsolicitedSuccessCannotConfirmAnAction() {
        let app = preview()
        app.open(URL(string: "org.isaaczhang.shield.setup://call-silencing/success?request=00000000-0000-0000-0000-000000000000")!)
        XCTAssertTrue(app.buttons["setup-shortcut-add"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["setup-shortcut-result"].exists)
    }

    func testRunErrorReturnsToAnUnconfirmedPreview() {
        let app = preview()
        app.buttons["setup-shortcut-already-added"].tap()
        app.buttons["setup-shortcut-run"].tap()
        // The simulator either lacks this imported file or cannot execute its telephony action.
        // Both must return a failure rather than imply that Phone settings were verified.
        let result = app.staticTexts["setup-shortcut-result"]
        XCTAssertTrue(result.waitForExistence(timeout: 20))
        XCTAssertTrue(result.label.contains("didn’t finish"))
        XCTAssertTrue(app.buttons["setup-shortcut-run"].exists)
    }

    func testLargestTextKeepsAddAndRunReachable() {
        let app = preview(["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        XCTAssertTrue(app.buttons["setup-shortcut-add"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["setup-shortcut-add"].isHittable)
        let alreadyAdded = app.buttons["setup-shortcut-already-added"]
        for _ in 0..<6 {
            if alreadyAdded.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(alreadyAdded.isHittable)
        alreadyAdded.tap()
        XCTAssertTrue(app.buttons["setup-shortcut-run"].isHittable)
        XCTAssertFalse(app.staticTexts["setup-shortcut-result"].exists)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Shortcut preview largest text dark"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

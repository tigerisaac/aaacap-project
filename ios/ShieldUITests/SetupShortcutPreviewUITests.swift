import XCTest

@MainActor
final class SetupShortcutPreviewUITests: XCTestCase {
    func testNativeImportCanBeReviewedWithoutRunningTheAction() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--uitesting-shortcut-preview"]
        app.launch()
        let addFile = app.buttons["setup-shortcut-add"]
        XCTAssertTrue(addFile.waitForExistence(timeout: 10))
        addFile.tap()
        let shortcutsDestination = app.cells["Shortcuts"].firstMatch
        XCTAssertTrue(shortcutsDestination.waitForExistence(timeout: 8))
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
    }
}

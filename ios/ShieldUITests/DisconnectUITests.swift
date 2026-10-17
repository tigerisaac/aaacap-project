import XCTest

@MainActor
final class DisconnectUITests: XCTestCase {
    func testHomeOffersDirectCancellationWithoutChangingSettings() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--redesign-state", "restoring", "--uitesting-disconnect", "--restoration-started"]
        app.launch()
        let keep = app.buttons["home-cancel-disconnection"]
        XCTAssertTrue(keep.appears(timeout: 5))
        XCTAssertTrue(keep.isHittable)
        capture(app, "Home offers keep using Shield")
        keep.tap()
        XCTAssertTrue(app.buttons["I haven’t changed settings"].appears(timeout: 5))
        app.buttons["I haven’t changed settings"].tap()
        XCTAssertTrue(app.staticTexts["Disconnection cancelled"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Open phone setup"].exists)
        capture(app, "Home cancellation acknowledged")
    }

    func testCancellationClearsSavedIntentAndCloseKeepsIt() {
        var app = launch(["--restoration-manual", "--forwarding-navigation-test"])
        next(app).tap()
        app.buttons["Close"].tap()
        XCTAssertTrue(app.buttons["forwarding-preview-home"].appears(timeout: 5))
        app.terminate()
        app = launch(["--restoration-resume", "--restoration-manual"])
        XCTAssertEqual(next(app).label, "My carrier forwarding is restored")
        reveal(app.buttons["disconnect-cancel"], app)
        app.buttons["disconnect-cancel"].tap()
        XCTAssertTrue(app.buttons["I haven’t changed settings"].appears(timeout: 5))
        capture(app, "Cancel unchanged disconnection")
        app.buttons["I haven’t changed settings"].tap()
        XCTAssertTrue(app.staticTexts["Disconnection cancelled"].appears(timeout: 5))
        XCTAssertFalse(next(app).exists)
        XCTAssertFalse(app.buttons["Open phone setup"].exists)
        capture(app, "Keeping Shield")
        app.terminate()
        app = launch(["--restoration-resume"])
        XCTAssertEqual(next(app).label, "Start disconnecting")
    }
    func testCancellationAfterChangesOffersSetupAtLargestText() {
        let app = launch(["--restoration-start-checks", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        reveal(app.buttons["disconnect-cancel"], app)
        app.buttons["disconnect-cancel"].tap()
        XCTAssertTrue(app.buttons["Review my phone setup"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["I haven’t changed settings"].exists)
        app.buttons["Review my phone setup"].tap()
        XCTAssertTrue(app.staticTexts["Disconnection cancelled"].appears(timeout: 5))
        capture(app, "Cancellation after changes top")
        reveal(app.buttons["Open phone setup"], app)
        XCTAssertTrue(app.buttons["Open phone setup"].isHittable)
        capture(app, "Cancellation after changes needs setup")
    }
    func testCancelledGuideOpensPhoneSetupAboveIt() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-disconnect", "--restoration-start-checks", "--uitesting-forwarding-route"]
        app.launch()
        app.tabBars.buttons["More"].tap()
        app.buttons["Settings"].tap()
        app.buttons["Disconnect Shield"].tap()
        XCTAssertTrue(next(app).appears(timeout: 5))
        reveal(app.buttons["disconnect-cancel"], app)
        app.buttons["disconnect-cancel"].tap()
        app.buttons["Review my phone setup"].tap()
        XCTAssertTrue(app.buttons["Open phone setup"].appears(timeout: 5))
        app.buttons["Open phone setup"].tap()
        XCTAssertTrue(app.staticTexts["Save Shield"].appears(timeout: 5))
        XCTAssertTrue(app.navigationBars["Phone setup"].exists)
        capture(app, "Cancelled disconnection opens setup")
    }
    func testFailedCancellationKeepsProgress() {
        let app = launch(["--restoration-start-checks", "--restoration-cancel-fails"])
        reveal(app.buttons["disconnect-cancel"], app)
        app.buttons["disconnect-cancel"].tap()
        app.buttons["Review my phone setup"].tap()
        XCTAssertTrue(app.staticTexts["Couldn’t confirm cancellation"].appears(timeout: 5))
        XCTAssertFalse(app.staticTexts["Disconnection cancelled"].exists)
        XCTAssertEqual(next(app).label, "The call worked")
        capture(app, "Cancellation failure preserves progress")
    }
    func testLocalGuideRemainsReadableWhenGuidedServiceIsUnavailable() {
        let app = launch(["--restoration-local-guide"])
        XCTAssertFalse(app.staticTexts["Steps couldn’t load"].exists)
        app.buttons["Read all phone steps"].tap()
        XCTAssertTrue(app.staticTexts["Synthetic saved carrier instructions"].appears(timeout: 5))
        capture(app, "Saved disconnect instructions")
        app.buttons["Read all phone steps"].tap()
        next(app).tap()
        XCTAssertTrue(app.staticTexts["Couldn’t start guided disconnect"].appears(timeout: 5))
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        XCTAssertFalse(app.buttons["Copy phone code"].exists)
        capture(app, "Unavailable service retains local guide")
    }

    func testOverviewExplainsSafeExitAndManualCarrierRecovery() {
        let app = launch(["--restoration-manual"])
        capture(app, "Disconnect overview")
        next(app).tap()
        XCTAssertTrue(app.staticTexts["Bring calls back to your phone"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Copy phone code"].exists)
        capture(app, "Disconnect saved carrier instructions")
        reveal(app.buttons["Something didn’t work"], app)
        app.buttons["Something didn’t work"].tap()
        XCTAssertTrue(app.buttons["Keep my place"].appears(timeout: 5))
        capture(app, "Disconnect help")
        app.buttons["Keep my place"].tap()
        XCTAssertEqual(next(app).label, "My carrier forwarding is restored")
    }
    func testFailedSaveKeepsTheSameStepAndOffersRetry() {
        let app = launch(["--restoration-start-checks", "--restoration-save-fails"])
        XCTAssertTrue(app.staticTexts["Check that calls reach you"].appears(timeout: 5))
        next(app).tap()
        XCTAssertTrue(app.staticTexts["This step isn’t saved yet"].appears(timeout: 5))
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        capture(app, "Disconnect save failure")
        reveal(app.buttons["Refresh progress"], app)
        XCTAssertTrue(app.buttons["Refresh progress"].isHittable)
        app.buttons["Refresh progress"].tap()
        XCTAssertTrue(app.staticTexts["This step isn’t saved yet"].waitForNonExistence(timeout: 5))
        capture(app, "Disconnect refreshed progress")
    }
    func testDeleteAccountReturnsFromGuidedRestorationBeforeFinalConfirmation() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-account-error", "--uitesting-disconnect", "--uitesting-deletion-restoration", "--restoration-start-checks"]
        app.launch()
        app.buttons["Delete account"].tap()
        // A prior fixture may be complete; the fixture reset is requested for this journey.
        XCTAssertTrue(app.buttons["Restore my phone"].appears(timeout: 5))
        capture(app, "Delete first restores phone")
        app.buttons["Restore my phone"].tap()
        XCTAssertTrue(app.staticTexts["Check that calls reach you"].appears(timeout: 5))
        next(app).tap()
        capture(app, "Disconnect carrier voicemail check")
        next(app).tap()
        XCTAssertTrue(app.staticTexts["restoration-complete"].appears(timeout: 5))
        capture(app, "Disconnect ready for deletion")
        next(app).tap()
        let remove = app.buttons["delete-account-confirm"]
        reveal(remove, app)
        XCTAssertTrue(remove.appears(timeout: 5))
        remove.tap()
        XCTAssertTrue(app.alerts["Delete your account?"].appears(timeout: 5))
        app.alerts.buttons["Keep my account"].tap()
        XCTAssertTrue(remove.exists)
    }
    func testCallChecksAndCompletionAtLargestText() {
        let app = launch(["--restoration-start-checks", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Disconnect call check large dark top")
        reveal(next(app), app)
        capture(app, "Disconnect call check large dark")
        next(app).tap()
        capture(app, "Disconnect voicemail large dark top")
        reveal(next(app), app)
        capture(app, "Disconnect voicemail large dark")
        next(app).tap()
        XCTAssertTrue(app.staticTexts["restoration-complete"].appears(timeout: 5))
        capture(app, "Disconnect complete large dark top")
        reveal(next(app), app)
        capture(app, "Disconnect complete large dark action")
    }
    func testDeletionProgressDistinguishesUnsentAcceptedAndCompleted() {
        for (arguments, title) in [(["--deletion-not-submitted"], "Sending your deletion request"), ([], "Deleting your account"), (["--deletion-completed"], "Your account is deleted")] {
            let app = XCUIApplication()
            app.launchArguments = ["--uitesting-deletion-progress", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] + arguments
            app.launch()
            XCTAssertTrue(app.staticTexts[title].appears(timeout: 5))
            capture(app, title)
            reveal(app.buttons[title == "Your account is deleted" ? "Done" : "Check progress"], app)
            capture(app, title + " lower content")
            app.terminate()
        }
    }
    private func launch(_ extra: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-restore"] + extra
        app.launch()
        XCTAssertTrue(next(app).appears(timeout: 5))
        return app
    }
    private func next(_ app: XCUIApplication) -> XCUIElement { app.buttons["disconnect-continue"] }
    private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
        for _ in 0..<15 {
            let bounds = element.frame
            if element.isHittable && bounds.minY >= 100 && bounds.maxY <= app.frame.maxY - 40 { break }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable)
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        // Let native navigation settle before recording visual evidence.
        Thread.sleep(forTimeInterval: 0.7)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = name; shot.lifetime = .keepAlways; add(shot)
    }
}

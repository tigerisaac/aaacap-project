import XCTest

@MainActor
final class OfflineHistoryUITests: XCTestCase {
    func testColdLaunchRestoresHomeBeforeShowingAccountScreens() {
        let app = XCUIApplication()
        let launch = ["--uitesting-offline-history", "--uitesting-cold-launch", "--uitesting-slow-session-restore",
                      "--uitesting-protection-check", "--protection-check-good"]
        for (index, extra) in [["--uitesting-light", "--seed-offline-history"],
                               ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]].enumerated() {
            app.launchArguments = launch + extra
            app.launch()
            let opening = app.descendants(matching: .any)["session-restoring"].firstMatch
            XCTAssertTrue(opening.appears(timeout: 3))
            for _ in 0..<3 {
                XCTAssertFalse(app.textFields["sign-in-phone"].exists)
                XCTAssertFalse(app.staticTexts["Welcome to Shield"].exists)
                XCTAssertFalse(app.staticTexts["Your account couldn’t load"].exists)
                XCTAssertFalse(app.staticTexts["Connect to check your setup"].exists)
                Thread.sleep(forTimeInterval: 0.3)
            }
            let openingImage = XCTAttachment(screenshot: app.screenshot())
            openingImage.name = "Cold launch restoring \(index)"
            openingImage.lifetime = .keepAlways
            add(openingImage)

            let title = app.staticTexts["today-status-title"]
            XCTAssertTrue(title.appears(timeout: 10))
            XCTAssertEqual(title.label, "Call checks are on")
            XCTAssertFalse(opening.exists)
            XCTAssertEqual(app.buttons["home-stopped-calls"].value as? String, "1 in total")
            // The delayed service has not returned; Home came from the protected local data.
            XCTAssertFalse(app.staticTexts["These calls may be out of date"].exists)
            XCTAssertFalse(app.staticTexts["Getting your phone settings…"].exists)
            XCTAssertFalse(app.staticTexts["Connect to check your setup"].exists)
            let homeImage = XCTAttachment(screenshot: app.screenshot())
            homeImage.name = "Cold launch restored Home \(index)"
            homeImage.lifetime = .keepAlways
            add(homeImage)
            app.terminate()
        }
    }

    func testOwnerHistoryReopensAndFiltersWithoutService() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-offline-history", "--seed-offline-history"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calls"].appears(timeout: 20))
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.staticTexts["Offline saved call"].appears(timeout: 10))
        app.terminate()
        app.launchArguments = ["--uitesting-offline-history"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calls"].appears(timeout: 20))
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.staticTexts["Offline saved call"].appears(timeout: 10))
        app.buttons["Stopped"].tap()
        XCTAssertTrue(app.staticTexts["Offline saved call"].appears(timeout: 10))
        app.staticTexts["Offline saved call"].tap()
        XCTAssertTrue(app.staticTexts["Call details couldn’t update"].appears(timeout: 10))
        XCTAssertTrue(app.staticTexts["Offline saved call"].exists)
        XCTAssertFalse(app.alerts["Couldn’t finish that"].exists)
    }

    func testEmptyPagesStayVisibleDuringRefreshAndMessagesHasNoStorageBanner() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-offline-history", "--seed-offline-history", "--uitesting-navigation-loading"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calls"].appears(timeout: 20))
        app.tabBars.buttons["Calls"].tap()
        app.buttons["Answered"].tap()
        let progress = app.descendants(matching: .any)["calls-refresh-progress"].firstMatch
        let loadingSnapshot = XCTAttachment(string: app.debugDescription)
        loadingSnapshot.name = "Slow call refresh accessibility"
        loadingSnapshot.lifetime = .keepAlways
        add(loadingSnapshot)
        XCTAssertTrue(progress.appears(timeout: 2), "Slow reads use compact toolbar feedback")
        XCTAssertTrue(app.staticTexts["No answered calls"].appears(timeout: 8))
        app.buttons["Stopped"].tap()
        app.buttons["Answered"].tap()
        XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Saved on this iPhone")).firstMatch.exists)
        assertNoLoadingFlash(app, title: "Getting your calls…")
        XCTAssertTrue(app.staticTexts["No answered calls"].exists)

        app.tabBars.buttons["Messages"].tap()
        XCTAssertTrue(app.staticTexts["No messages yet"].appears(timeout: 8))
        XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Recordings are saved on this iPhone")).firstMatch.exists)
        app.tabBars.buttons["More"].tap()
        app.tabBars.buttons["Messages"].tap()
        assertNoLoadingFlash(app, title: "Getting your messages…")
        XCTAssertTrue(app.staticTexts["No messages yet"].exists)
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = "Messages without storage banner"
        capture.lifetime = .keepAlways
        add(capture)
    }

    private func assertNoLoadingFlash(_ app: XCUIApplication, title: String) {
        let appears = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true"), object: app.staticTexts[title])
        appears.isInverted = true
        XCTAssertEqual(XCTWaiter.wait(for: [appears], timeout: 1), .completed, "A refresh replaced cached content with a loading box")
    }

}

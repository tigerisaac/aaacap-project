import XCTest

@MainActor
final class FiveAreaRefinementUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testSettingsPrioritizesEverydayControlsAndReturnsFromDestinations() {
        let app = launch(["--uitesting-preview", "--uitesting-single-person", "--uitesting-light"])
        app.tabBars.buttons["More"].tap(); app.buttons["Settings"].tap()
        XCTAssertTrue(app.staticTexts["Call protection"].appears(timeout: 5))
        XCTAssertTrue(app.buttons["Checks while you talk"].isHittable)
        XCTAssertFalse(app.buttons["Automatic text checks"].exists)
        capture(app, "Settings everyday controls light")
        let caretaker = app.buttons["caretakers-settings"]
        reveal(caretaker, app); caretaker.tap()
        XCTAssertTrue(app.navigationBars["Caretakers"].appears(timeout: 5))
        app.navigationBars.buttons.firstMatch.tap()
        let sharing = app.buttons["call-sharing-settings"]
        reveal(sharing, app); sharing.tap()
        XCTAssertTrue(app.staticTexts["Your calls are private"].appears(timeout: 5))
        capture(app, "Call sharing empty light")
        app.navigationBars.buttons.firstMatch.tap()
        let disconnect = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Disconnect Shield")).firstMatch
        reveal(disconnect, app)
        XCTAssertTrue(app.staticTexts["Account"].exists)
        capture(app, "Settings account actions light")
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.navigationBars["More"].appears(timeout: 5))
    }

    func testUnavailableCaretakersAndEmptyRequestsHaveAnExit() {
        for variant in ["light", "largest-dark"] {
        let appearance = variant == "light" ? ["--uitesting-light"] : ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        let app = launch(["--uitesting-preview", "--uitesting-single-person", "--uitesting-caretakers-unavailable", "--uitesting-alert-requests-empty"] + appearance)
        app.tabBars.buttons["More"].tap(); app.buttons["Settings"].tap()
        let caretakers = app.buttons["caretakers-settings"]
        reveal(caretakers, app); caretakers.tap()
        XCTAssertTrue(app.staticTexts["Caretaker alerts aren’t available yet"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Add caretaker"].exists)
        let title = app.staticTexts["Caretaker alerts aren’t available yet"]
        XCTAssertGreaterThan(title.frame.height, 30, "The full unavailable heading must wrap instead of truncating.")
        capture(app, "Caretakers unavailable \(variant) title")
        reveal(app.buttons["Check again"], app); app.buttons["Check again"].tap()
        reveal(app.buttons["Done"], app)
        capture(app, "Caretakers unavailable \(variant) recovery")
        app.buttons["Done"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].appears(timeout: 5))
        let requests = app.buttons["Alerts for others"]
        reveal(requests, app); requests.tap()
        XCTAssertTrue(app.staticTexts["No requests"].appears(timeout: 5))
        capture(app, "Alert requests empty \(variant) title")
        reveal(app.buttons["Done"], app)
        capture(app, "Alert requests empty \(variant) exit")
        app.buttons["Done"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].appears(timeout: 5))
        let sharing = app.buttons["call-sharing-settings"]
        reveal(sharing, app, towardTop: true); sharing.tap()
        XCTAssertTrue(app.staticTexts["Your calls are private"].appears(timeout: 5))
        capture(app, "Call sharing empty \(variant) title")
        let alerts = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Caretaker alerts")).firstMatch
        reveal(alerts, app)
        capture(app, "Call sharing empty \(variant) action")
        alerts.tap()
        XCTAssertTrue(app.navigationBars["Caretakers"].appears(timeout: 5))
        reveal(app.buttons["Done"], app); app.buttons["Done"].tap()
        XCTAssertTrue(app.navigationBars["Call sharing"].appears(timeout: 5))
        }
    }

    func testUnavailableRecordingKeepsDetailsWithoutOfferingBrokenPlayback() {
        for flag in ["--uitesting-audio-expired", "--uitesting-audio-other-phone"] {
            for hasSummary in [true, false] {
            let app = launch(["--uitesting-screen", "audio", flag] + (hasSummary ? [] : ["--uitesting-audio-no-summary"]))
            XCTAssertTrue(app.staticTexts["Sample audio message"].appears(timeout: 5))
            XCTAssertFalse(app.buttons["Listen to message"].exists)
            XCTAssertFalse(app.staticTexts["A summary isn’t available for this message. You can still listen."].exists)
            if !hasSummary {
                XCTAssertTrue(app.staticTexts["A summary isn’t available for this message."].exists)
            }
            let unavailable = app.descendants(matching: .any)["message-audio-unavailable"]
            reveal(unavailable, app); XCTAssertTrue(unavailable.exists)
            capture(app, "Unavailable recording \(flag) \(hasSummary ? "summary" : "no-summary")")
            let help = app.buttons["Get help"]
            reveal(help, app); help.tap()
            XCTAssertTrue(app.navigationBars["Get help"].appears(timeout: 5))
            app.navigationBars.buttons.firstMatch.tap()
            XCTAssertTrue(app.navigationBars["Voicemail"].appears(timeout: 5))
            }
        }
    }

    func testFailedSharingChangeIsVisibleAndKeepsAccessAtLargestText() {
        let app = launch(["--uitesting-screen", "sharing-access", "--uitesting-sharing-confirmations",
                          "--uitesting-sharing-revoke-fails", "--uitesting-dark",
                          "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let stop = app.buttons["Stop sharing with Jamie"]
        reveal(stop, app); stop.tap()
        XCTAssertTrue(app.alerts["Stop sharing with Jamie?"].appears(timeout: 3))
        app.alerts.buttons["Stop sharing"].tap()
        let error = app.staticTexts["Change not confirmed"]
        XCTAssertTrue(error.appears(timeout: 5))
        XCTAssertGreaterThanOrEqual(error.frame.minY, app.navigationBars.firstMatch.frame.maxY)
        XCTAssertLessThanOrEqual(error.frame.maxY, app.frame.maxY - 35)
        capture(app, "Call sharing failed change largest dark")
        reveal(stop, app, towardTop: true); XCTAssertTrue(stop.isEnabled)
        stop.tap(); app.alerts.buttons["Keep sharing"].tap()
        XCTAssertTrue(app.staticTexts["Jamie"].exists)
    }

    func testSettingsReturnOffersReopenBeforeConfirmation() {
        let app = launch(["--uitesting-forwarding", "--forwarding-start-settings", "--shortcut-already-added"])
        let primary = app.buttons["forwarding-continue"]
        XCTAssertTrue(primary.appears(timeout: 10)); primary.tap()
        XCUIDevice.shared.press(.home); app.activate()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].appears(timeout: 5))
        let settled = expectation(description: "Native foreground transition finishes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { settled.fulfill() }
        wait(for: [settled], timeout: 2)
        XCTAssertEqual(primary.label, "Silence has a checkmark")
        capture(app, "Settings return with visible reopen")
        primary.tap()
        XCTAssertEqual(primary.label, "Live Voicemail is off")
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        capture(app, "Voicemail remains unconfirmed after return")
    }

    func testRefinedScreensAtBothAppearancesAndLargestText() {
        for variant in ["light", "dark", "largest-dark"] {
            let appearance = variant == "light" ? ["--uitesting-light"] : ["--uitesting-dark"]
            let size = variant == "largest-dark" ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []
            for screen in ["add-number", "trusted-contacts", "sharing-access", "audio"] {
                let app = launch(["--uitesting-screen", screen] + appearance + size)
                XCTAssertTrue(app.navigationBars.firstMatch.appears(timeout: 5))
                capture(app, "Five areas \(screen) \(variant) top")
                let action = switch screen {
                case "add-number": app.buttons["Save number"]
                case "trusted-contacts": app.buttons["Add caretaker"]
                case "sharing-access": app.buttons["Stop sharing with Morgan"]
                default: app.buttons["Listen to message"]
                }
                reveal(action, app); XCTAssertTrue(action.isHittable)
                if variant == "largest-dark" { capture(app, "Five areas \(screen) \(variant) action") }
                if screen == "trusted-contacts" {
                    action.tap()
                    XCTAssertTrue(app.navigationBars["Add caretaker"].appears(timeout: 5))
                    capture(app, "Five areas add-caretaker \(variant) top")
                    let send = app.buttons["trusted-contact-send"]
                    reveal(send, app); XCTAssertFalse(send.isEnabled)
                    if variant == "largest-dark" { capture(app, "Five areas add-caretaker \(variant) action") }
                }
            }
        }
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication(); app.launchArguments = arguments; app.launch(); return app
    }

    private func reveal(_ element: XCUIElement, _ app: XCUIApplication, towardTop: Bool = false) {
        for _ in 0..<14 {
            let top = app.navigationBars.firstMatch.frame.maxY
            let bottom = app.tabBars.firstMatch.exists ? app.tabBars.firstMatch.frame.minY : app.frame.maxY - 35
            if element.exists, element.isHittable, element.frame.minY >= top, element.frame.maxY <= bottom { return }
            let down = element.exists && !element.frame.isEmpty ? element.frame.minY < top : towardTop
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.35 : 0.72))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.7 : 0.35)))
        }
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        Thread.sleep(forTimeInterval: 0.6)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}

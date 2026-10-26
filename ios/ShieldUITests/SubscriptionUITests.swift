import XCTest

@MainActor
final class SubscriptionUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testPublicPlansShowAnnualTotalAndEquivalent() {
        let app = launch("offer")
        XCTAssertTrue(app.staticTexts["$9.99 / month"].exists)
        reveal(app.staticTexts["$99.99 / year"], app)
        XCTAssertTrue(app.staticTexts["$8.33 / month, billed yearly"].exists)
        capture(app, "Subscription annual billing")
        reveal(app.buttons["Restore purchases"], app)
        XCTAssertTrue(app.buttons["Restore purchases"].exists)
        XCTAssertTrue(app.buttons["Terms of use"].exists || app.links["Terms of use"].exists)
        XCTAssertFalse(app.buttons["Manage subscription"].exists)
    }
    func testFreeWeekShowsBothRenewalPricesAndCancellationTerms() {
        let app = launch("trial")
        XCTAssertTrue(app.staticTexts["1 week free"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["Then $9.99 / month"].exists)
        reveal(app.staticTexts["$99.99 / year"], app)
        XCTAssertTrue(app.staticTexts["$99.99 / year"].exists)
        XCTAssertTrue(app.staticTexts["$8.33 / month, billed yearly"].exists)
        XCTAssertFalse(app.staticTexts["Then $99.99 / year"].exists)
        let yearly = app.buttons["plan-year"]; reveal(yearly, app); yearly.tap()
        let yearlyAction = app.buttons["subscribe-year"]; reveal(yearlyAction, app)
        XCTAssertTrue(yearlyAction.label.contains("Start yearly"))
        XCTAssertTrue(app.staticTexts["annual-savings"].label.contains("Save 16 percent"))
        capture(app, "Monthly trial with yearly selected")
        let monthly = app.buttons["plan-month"]; revealUp(monthly, app); monthly.tap()
        let disclosure = app.staticTexts["subscription-renewal-terms"]
        reveal(disclosure, app)
        XCTAssertTrue(disclosure.exists)
        capture(app, "One-week trial renewal disclosure")
    }
    func testFreeWeekAtLargestTextKeepsYearlyTotalAndActionReachable() {
        let app = launch("trial", large: true)
        let yearly = app.staticTexts["$99.99 / year"]
        reveal(yearly, app); XCTAssertTrue(yearly.isHittable)
        let option = app.buttons["plan-year"]; reveal(option, app); option.tap()
        let action = app.buttons["subscribe-year"]
        reveal(action, app); XCTAssertTrue(action.isHittable)
        capture(app, "One-week trial largest text")
    }
    func testPilotNeverSeesMonetaryActionsAtLargestText() {
        let app = launch("pilot", large: true)
        XCTAssertTrue(app.staticTexts["Your pilot access is active."].exists)
        XCTAssertFalse(app.buttons["Restore purchases"].exists)
        XCTAssertFalse(app.buttons["Manage subscription"].exists)
        XCTAssertFalse(app.staticTexts["Monthly"].exists)
        capture(app, "Pilot access largest dark")
    }
    func testExpiredPilotHasSupportInsteadOfAPaywall() {
        let app = launch("pilot-expired")
        XCTAssertTrue(app.staticTexts["Contact Shield to arrange the next steps for your phone."].exists)
        XCTAssertFalse(app.buttons["Restore purchases"].exists)
        XCTAssertFalse(app.buttons["subscribe-month"].exists)
    }
    func testPendingPurchaseExplainsApproval() {
        let app = launch("pending", large: true)
        let purchase = app.buttons["subscribe-month"]
        reveal(purchase, app); XCTAssertTrue(purchase.exists); XCTAssertFalse(purchase.isEnabled)
        let message = app.staticTexts["Your purchase is waiting for approval. You won’t need to buy it again."]
        reveal(message, app); XCTAssertTrue(message.exists)
        capture(app, "Purchase pending largest dark")
    }
    func testFailedLookupRemainsRecoverable() {
        let app = launch("error")
        XCTAssertTrue(app.staticTexts["Your access couldn’t be checked"].exists)
        XCTAssertTrue(app.buttons["Try again"].exists)
        XCTAssertFalse(app.buttons["subscribe-month"].exists)
        capture(app, "Subscription lookup error")
    }
    func testBillingGraceShowsAccessDeadlineInsteadOfAPastRenewal() {
        let app = launch("billing-issue")
        XCTAssertTrue(app.staticTexts["Apple needs you to check your payment details. Open Manage subscription for help."].exists)
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Available through ")).firstMatch.exists)
        XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Renews ")).firstMatch.exists)
        XCTAssertTrue(app.buttons["Manage subscription"].exists)
        XCTAssertFalse(app.buttons["subscribe-month"].exists)
        capture(app, "Subscription billing grace")
    }
    func testSubscribedAccountHasManagementAndDeletionReminder() {
        let app = launch("subscribed")
        XCTAssertTrue(app.staticTexts["Your subscription is active."].exists)
        XCTAssertTrue(app.buttons["Manage subscription"].exists)
        XCTAssertFalse(app.buttons["subscribe-month"].exists)
        app.navigationBars.buttons.firstMatch.tap()
        let delete = app.buttons["Delete account"]; reveal(delete, app); delete.tap()
        let notice = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "does not cancel your Apple subscription")).firstMatch
        XCTAssertTrue(notice.appears(timeout: 5))
        XCTAssertTrue(app.buttons["Manage subscription"].exists)
        capture(app, "Subscription deletion reminder")
    }
    func testDeletionKeepsAppleReminderWhenAccessLookupFails() {
        let app = launch("error", extra: ["--uitesting-deletion-public"])
        app.navigationBars.buttons.firstMatch.tap()
        let delete = app.buttons["Delete account"]; reveal(delete, app); delete.tap()
        let notice = app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "If you have an Apple subscription")).firstMatch
        XCTAssertTrue(notice.appears(timeout: 5))
        XCTAssertTrue(app.buttons["Manage subscription"].exists)
        let remove = app.buttons["delete-account-confirm"]; reveal(remove, app)
        XCTAssertTrue(remove.isEnabled)
        capture(app, "Deletion with billing lookup unavailable")
    }
    func testUnsubscribedPublicAccountStartsAtThePlans() {
        let app = gated("offer")
        XCTAssertTrue(app.navigationBars["Choose a plan"].appears(timeout: 5))
        XCTAssertFalse(app.tabBars.firstMatch.exists)
        XCTAssertTrue(app.staticTexts["$9.99 / month"].exists)
        capture(app, "Plans before the app")
        reveal(app.buttons["Sign out"], app)
        XCTAssertTrue(app.buttons["Alerts for others"].exists)
        XCTAssertTrue(app.buttons["Delete account"].exists)
        XCTAssertTrue(app.buttons["Sign out"].isHittable)
        capture(app, "Plans keep caretaker, deletion and sign-out")
    }
    func testPilotSubscribedAndLapsedAccountsSkipThePlans() {
        for state in ["pilot", "subscribed", "billing-issue"] {
            let app = gated(state)
            XCTAssertTrue(app.tabBars.buttons["Home"].appears(timeout: 5), state)
            XCTAssertFalse(app.navigationBars["Choose a plan"].exists, state)
            app.terminate()
        }
    }
    func testPlansComeBeforeProtectionOnboarding() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--uitesting-subscription", "offer", "--uitesting-plan-gate"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Choose a plan"].appears(timeout: 5))
        XCTAssertFalse(app.tabBars.firstMatch.exists)
        capture(app, "Plans before protection onboarding")
    }
    private func gated(_ state: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-subscription", state, "--uitesting-plan-gate"]
        app.launch(); return app
    }
    private func launch(_ state: String, large: Bool = false, extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-subscription", state] + extra + (large
            ? ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : [])
        app.launch(); app.tabBars.buttons["More"].tap(); app.buttons["Settings"].tap()
        let access = app.buttons["subscription-settings"]; reveal(access, app); access.tap()
        XCTAssertTrue(app.navigationBars["Shield access"].appears(timeout: 5)); return app
    }
    private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
        for _ in 0..<16 where !element.isHittable { app.swipeUp() }
    }
    private func revealUp(_ element: XCUIElement, _ app: XCUIApplication) {
        for _ in 0..<16 { if element.isHittable { return }; app.swipeDown() }
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = name; image.lifetime = .keepAlways; add(image)
    }
}

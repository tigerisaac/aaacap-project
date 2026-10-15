import XCTest

extension XCUIApplication {
    /// Rows expose one complete action to assistive technologies, rather than separate text fragments.
    func historyRow(_ title: String) -> XCUIElement {
        buttons.matching(NSPredicate(format: "(identifier BEGINSWITH 'call-row-' OR identifier BEGINSWITH 'voicemail-row-') AND label BEGINSWITH %@", title)).firstMatch
    }
}

extension XCUIElement {
    /// Same result as `waitForExistence(timeout:)`, but checks immediately first. XCTest's own wait
    /// makes its first check about a second after it starts, even when the element is already there.
    func appears(timeout: TimeInterval) -> Bool {
        exists || waitForExistence(timeout: timeout)
    }
}

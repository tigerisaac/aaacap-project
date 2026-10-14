import XCTest

extension XCUIApplication {
    /// Rows expose one complete action to assistive technologies, rather than separate text fragments.
    func historyRow(_ title: String) -> XCUIElement {
        buttons.matching(NSPredicate(format: "(identifier BEGINSWITH 'call-row-' OR identifier BEGINSWITH 'voicemail-row-') AND label BEGINSWITH %@", title)).firstMatch
    }
}

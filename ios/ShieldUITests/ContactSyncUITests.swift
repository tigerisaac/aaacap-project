import XCTest

@MainActor
final class ContactSyncUITests: XCTestCase {
    func testRemovingOneNumberPreservesOtherFieldsAndRestoresWithoutDuplicates() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-contact-storage"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Contact restore passed"].appears(timeout: 20))
    }
}

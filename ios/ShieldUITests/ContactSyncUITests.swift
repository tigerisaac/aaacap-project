import XCTest

@MainActor
final class ContactSyncUITests: XCTestCase {
    func testMalformedSavedEntriesDoNotRejectValidContactsOrEditTheAddressBook() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-contact-storage", "--uitesting-contact-sharing"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Contact sharing passed"].appears(timeout: 20))
    }

    func testRemovingOneNumberPreservesOtherFieldsAndRestoresWithoutDuplicates() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-contact-storage"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Contact restore passed"].appears(timeout: 20))
    }
}

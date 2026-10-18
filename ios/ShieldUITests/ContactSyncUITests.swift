import XCTest

@MainActor
final class ContactSyncUITests: XCTestCase {
    func testAcceptedNumberFormatsRemoveTheirNativeFieldAndRestoreItExactly() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-contact-storage", "--uitesting-contact-number-identity"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Contact identity check finished"].appears(timeout: 60))
        let report = app.staticTexts["contact-identity-report"].label
        let attachment = XCTAttachment(string: report)
        attachment.name = "native-contact-identity-report"; attachment.lifetime = .keepAlways; add(attachment)
        let rows = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(report.utf8)) as? [[String: Any]])
        XCTAssertEqual(rows.count, 16)
        for row in rows {
            for key in ["recognizedBeforeRemoval", "passiveReadBeforeRemoval", "passiveReadAfterRemoval", "secondCycleRestoresExactly", "absentRemovalHasNoBackup", "restoredBackupConsumed", "secondCycleBackupConsumed", "completedRestoreDoesNotResurrectDeletedCards", "removalReturnedSuccess", "exactFieldRemoved", "unrelatedFieldsPreserved",
                        "absentAfterRemoval", "originalFieldsRestored", "repeatRestoreHasNoDuplicates", "recognizedAfterRestore", "cleanupSucceeded"] {
                XCTAssertEqual(row[key] as? Bool, true, "\(row["case"] ?? "unknown") / \(key)")
            }
        }
    }

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

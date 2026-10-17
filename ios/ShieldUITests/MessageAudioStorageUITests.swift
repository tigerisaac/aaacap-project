import XCTest

@MainActor
final class MessageAudioStorageUITests: XCTestCase {
    func testSavedAudioPlaysAfterRelaunchWithoutServiceAndIsExcludedFromBackup() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-audio-storage", "--seed-audio-storage"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Local audio playback passed"].appears(timeout: 20), app.staticTexts["audio-storage-result"].label)
        app.terminate()
        app.launchArguments = ["--uitesting-audio-storage"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Local audio playback passed"].appears(timeout: 20), app.staticTexts["audio-storage-result"].label)
    }
}

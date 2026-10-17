import XCTest

@MainActor
final class ToggleClippingDiagnosticTests: XCTestCase {
    override func setUp() { continueAfterFailure = true }

    func testNativeToggleClippingReference() throws {
        try audit(["--uitesting-native-reference", "--native-toggle-text-reference"], name: "native-switches")
    }

    func testShieldSwitchClipping() throws {
        for screen in ["quiet", "protection"] {
            try audit(["--uitesting-screen", screen], name: "shield-\(screen)")
        }
    }

    private func audit(_ arguments: [String], name: String) throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-light"] + arguments
        app.launch()
        XCTAssertTrue(app.switches.firstMatch.appears(timeout: 5))
        Thread.sleep(forTimeInterval: 0.8)
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = name; capture.lifetime = .keepAlways; add(capture)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = "\(name)-tree"; tree.lifetime = .keepAlways; add(tree)
        try app.performAccessibilityAudit(for: .textClipped) { issue in
            let details = XCTAttachment(string: "\(issue.compactDescription)\n\(issue.detailedDescription)\n\(issue.element?.debugDescription ?? "No element")")
            details.name = "\(name)-issue"; details.lifetime = .keepAlways; self.add(details)
            print("Toggle diagnostic: \(name): \(issue.compactDescription): \(issue.element?.label ?? "No element")")
            return false
        }
    }
}

#if DEBUG && targetEnvironment(simulator)
import Observation
import Foundation

/// ScreenCaptureKit is not shipped in the iPhone simulator SDK. Simulators can
/// exercise authored cards and recognition fixtures, never real screen capture.
@available(iOS 27.0, *)
@MainActor @Observable
final class LiveSetupCapture {
    private(set) var active = false
    private(set) var requestingPermission = false
    private(set) var instruction: LiveSetupInstruction = .waiting
    private(set) var failure: String?
    @ObservationIgnored var didStart: (@MainActor () async -> Void)?
    @ObservationIgnored var didUpdate: (@MainActor (LiveSetupInstruction) -> Void)?
    @ObservationIgnored var didStop: (@MainActor () -> Void)?

    func request() { failure = "Screen guidance needs a real iPhone. This simulator can show the practice guide only." }
    func stop() { instruction = .stopped; didStop?() }
}
#endif

import CallKit
import Foundation

/// Blocks every number Shield stopped a scam from, including ones she has since saved or called back, which would
/// otherwise ring her directly and never reach Shield. The list is small, so every request is a full reload.
final class CallDirectoryHandler: CXCallDirectoryProvider, CXCallDirectoryExtensionContextDelegate {
    override func beginRequest(with context: CXCallDirectoryExtensionContext) {
        context.delegate = self
        if context.isIncremental { context.removeAllBlockingEntries(); context.removeAllIdentificationEntries() }
        let list = CallDirectoryList.load()
        for number in list?.blocked ?? [] {
            context.addBlockingEntry(withNextSequentialPhoneNumber: number)
        }
        for label in list?.labels ?? [] {
            context.addIdentificationEntry(withNextSequentialPhoneNumber: label.number, label: label.name)
        }
        context.completeRequest()
    }

    func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {}
}

import Foundation
import JavaScriptCore

/// Uses the same pinned, offline parser as shared contacts on the server.
/// PhoneContacts owns this context and serializes access; no native APIs are exported.
final class ContactPhoneParser {
    struct Identity: Equatable, Sendable {
        let number: String
        let extensionDigits: String?
    }
    enum Failure: Error { case unavailable, invalidResult }

    private let context: JSContext
    private let parse: JSValue

    convenience init() throws {
        guard let script = Bundle.main.url(forResource: "libphonenumber-min", withExtension: "js") else {
            throw Failure.unavailable
        }
        try self.init(script: script)
    }

    init(script: URL) throws {
        guard let context = JSContext() else { throw Failure.unavailable }
        context.evaluateScript(try String(contentsOf: script, encoding: .utf8), withSourceURL: script)
        guard context.exception == nil,
              context.evaluateScript("typeof libphonenumber === 'object' && typeof libphonenumber.parsePhoneNumberFromString === 'function'")?.toBool() == true,
              let parse = context.evaluateScript("""
                (function(raw) {
                    const parsed = libphonenumber.parsePhoneNumberFromString(raw, 'US');
                    return parsed && parsed.isValid()
                        ? { number: parsed.number, extensionDigits: parsed.ext || null }
                        : null;
                })
                """), context.exception == nil, parse.isObject else { throw Failure.unavailable }
        self.context = context
        self.parse = parse
    }

    func identity(_ value: String) throws -> Identity? {
        context.exception = nil
        guard let result = parse.call(withArguments: [value]), context.exception == nil else { throw Failure.invalidResult }
        if result.isNull { return nil }
        guard result.isObject,
              let number = result.forProperty("number"), number.isString,
              let normalized = number.toString(), normalized.hasPrefix("+"), (3...16).contains(normalized.count),
              normalized.dropFirst().allSatisfy({ $0.isASCII && $0.isNumber }) else { throw Failure.invalidResult }
        let ext = result.forProperty("extensionDigits")
        guard ext?.isNull == true || ext?.isString == true else { throw Failure.invalidResult }
        return Identity(number: normalized, extensionDigits: ext?.isString == true ? ext?.toString() : nil)
    }
}

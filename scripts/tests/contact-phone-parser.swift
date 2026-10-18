import Foundation

private struct Sample: Decodable { let id: String; let raw: String; let normalized: String }
private enum CheckFailure: Error { case assertion(String) }

@main
struct ContactPhoneParserTests {
    static func main() throws {
        let samples = try JSONDecoder().decode([Sample].self, from: Data(contentsOf: URL(filePath: CommandLine.arguments[1])))
        let parser = try ContactPhoneParser(script: URL(filePath: CommandLine.arguments[2]))
        var extensionCases = 0
        for sample in samples {
            let value = try parser.identity(sample.raw)
            guard value?.number == sample.normalized else { throw CheckFailure.assertion(sample.id) }
            guard try parser.identity(sample.raw) == value else { throw CheckFailure.assertion("unstable identity") }
            if sample.id.hasPrefix("extension-") {
                guard value?.extensionDigits?.isEmpty == false else { throw CheckFailure.assertion("missing extension") }
                extensionCases += 1
            }
        }
        let invalid = ["", "12", "not a number", "+", String(repeating: "9", count: 300)]
        for value in invalid {
            guard try parser.identity(value) == nil else { throw CheckFailure.assertion("invalid field accepted") }
        }
        let directory = URL.temporaryDirectory.appending(path: UUID().uuidString, directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        var rejected = 0
        for source in ["", "invalid javascript !", "var libphonenumber = {};",
                       "var libphonenumber = {parsePhoneNumberFromString: function() {throw new Error('synthetic');}};",
                       "var libphonenumber = {parsePhoneNumberFromString: function() {return {isValid:()=>true, number:'invalid'};}};",
                       "var libphonenumber = {parsePhoneNumberFromString: function() {return {isValid:()=>true, number:'+1234567', ext:42};}};"] {
            let script = directory.appending(path: "failure.js")
            try source.write(to: script, atomically: true, encoding: .utf8)
            do {
                let broken = try ContactPhoneParser(script: script)
                _ = try broken.identity("synthetic")
            } catch { rejected += 1 }
        }
        guard rejected == 6 else { throw CheckFailure.assertion("parser failure did not fail closed") }
        let start = ContinuousClock.now
        for index in 0..<5000 { _ = try parser.identity(samples[index % samples.count].raw) }
        let duration = start.duration(to: .now).components
        let milliseconds = Double(duration.seconds) * 1000 + Double(duration.attoseconds) / 1e15
        let report: [String: Any] = ["passed": true, "identityCases": samples.count,
                                  "extensionCases": extensionCases, "invalidCases": invalid.count,
                                  "failureCases": rejected, "fiveThousandParsesMilliseconds": milliseconds]
        print(String(decoding: try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]), as: UTF8.self))
    }
}

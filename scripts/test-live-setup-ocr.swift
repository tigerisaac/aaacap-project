// Authored public-label fixtures only; never use owner screenshots here.
import AppKit
import Vision

@main struct FixtureChecks {
    static func main() throws {
        let size = NSSize(width: 780, height: 1688)
        var failures = 0
        for (name, dark, large, expected) in [
            ("light", false, false, LiveSetupInstruction.chooseSilence),
            ("dark", true, false, LiveSetupInstruction.chooseSilence),
            ("large-wrapped", true, true, LiveSetupInstruction.chooseSilence)
        ] {
            let image = NSImage(size: size)
            image.lockFocusFlipped(true)
            (dark ? NSColor.black : NSColor(calibratedWhite: 0.95, alpha: 1)).setFill()
            NSRect(origin: .zero, size: size).fill()
            let ink = dark ? NSColor.white : NSColor.black
            func draw(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, font: CGFloat, bold: Bool = false, centered: Bool = false) {
                let style = NSMutableParagraphStyle()
                style.lineBreakMode = .byWordWrapping
                if centered { style.alignment = .center }
                (text as NSString).draw(in: NSRect(x: x, y: y, width: width, height: height), withAttributes: [
                    .font: NSFont.systemFont(ofSize: font, weight: bold ? .semibold : .regular),
                    .foregroundColor: ink, .paragraphStyle: style
                ])
            }
            draw("Phone", x: 150, y: 90, width: 480, height: 64, font: 36, bold: true, centered: true)
            draw("Screen Unknown Callers", x: 70, y: 380, width: 650, height: large ? 205 : 80, font: large ? 82 : 40, bold: true)
            draw("Never", x: 90, y: large ? 640 : 550, width: 590, height: 110, font: large ? 76 : 36)
            draw("Ask Reason for Calling", x: 90, y: large ? 790 : 660, width: 590, height: large ? 230 : 85, font: large ? 76 : 36)
            draw("Silence", x: 90, y: large ? 1060 : 770, width: 590, height: 110, font: large ? 76 : 36)
            image.unlockFocus()
            guard let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
                throw NSError(domain: "SyntheticGuideImage", code: 1)
            }
            let labels = try LiveSetupTextRecognition.observations(using: VNImageRequestHandler(cgImage: cg))
            let result = LiveSetupRecognition.instruction(for: labels)
            print("OCR_FIXTURE",name,result.rawValue,"expected",expected.rawValue)
            if result != expected { failures += 1 }
        }
        if failures > 0 { print("FAILED", failures); exit(1) }
        print("All synthetic OCR fixtures passed")
    }
}

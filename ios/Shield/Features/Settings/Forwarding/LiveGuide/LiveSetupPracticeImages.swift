#if DEBUG
import UIKit

/// Permission-free diagnostics contain only authored public Settings labels.
@MainActor
enum LiveSetupPracticeImages {
    struct Fixture: @unchecked Sendable {
        let name: String
        let image: CGImage
        let expected: LiveSetupInstruction
    }

    static func make() -> [Fixture] {
        [(false, false), (true, false), (true, true)].compactMap { dark, large in
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            let image = UIGraphicsImageRenderer(size: CGSize(width: 780, height: 1688), format: format).image { context in
                (dark ? UIColor.black : UIColor(white: 0.95, alpha: 1)).setFill()
                context.fill(CGRect(x: 0, y: 0, width: 780, height: 1688))
                let ink = dark ? UIColor.white : UIColor.black
                func draw(_ value: String, x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat,
                          size: CGFloat, bold: Bool = false, centered: Bool = false) {
                    let style = NSMutableParagraphStyle()
                    style.lineBreakMode = .byWordWrapping
                    if centered { style.alignment = .center }
                    (value as NSString).draw(in: CGRect(x: x, y: y, width: width, height: height), withAttributes: [
                        .font: UIFont.systemFont(ofSize: size, weight: bold ? .semibold : .regular),
                        .foregroundColor: ink, .paragraphStyle: style
                    ])
                }
                draw("Phone", x: 150, y: 90, width: 480, height: 64, size: 36, bold: true, centered: true)
                draw("Screen Unknown Callers", x: 70, y: 380, width: 650, height: large ? 205 : 80, size: large ? 82 : 40, bold: true)
                draw("Never", x: 90, y: large ? 640 : 550, width: 590, height: 110, size: large ? 76 : 36)
                draw("Ask Reason for Calling", x: 90, y: large ? 790 : 660, width: 590, height: large ? 230 : 85, size: large ? 76 : 36)
                draw("Silence", x: 90, y: large ? 1060 : 770, width: 590, height: 110, size: large ? 76 : 36)
            }
            guard let image = image.cgImage else { return nil }
            return Fixture(name: large ? "large" : dark ? "dark" : "light", image: image, expected: .chooseSilence)
        }
    }
}
#endif

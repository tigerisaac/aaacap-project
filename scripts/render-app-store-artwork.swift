// swift scripts/render-app-store-artwork.swift <raw-capture-directory> <output-directory> <width> <height>
// Composes original marketing pages around unmodified native simulator captures.
import AppKit
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 5, let width = Int(args[3]), let height = Int(args[4]),
      [(1320, 2868), (1206, 2622)].contains(where: { $0 == (width, height) }) else {
    fatalError("Expected raw directory, output directory, and supported portrait width/height")
}
let source = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[2])
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let navy = NSColor(srgbRed: 0, green: 0.149, blue: 0.392, alpha: 1)
let paper = NSColor(srgbRed: 0.949, green: 0.953, blue: 0.957, alpha: 1)
let ink = NSColor(srgbRed: 0.063, green: 0.118, blue: 0.196, alpha: 1)
let pale = NSColor(srgbRed: 0.80, green: 0.86, blue: 0.96, alpha: 1)
let entries: [(String, String, String, Bool)] = [
    ("01-home", "Your calls.\nYour choice.", "Screen unfamiliar calls before\nyou decide to answer.", true),
    ("02-calls", "Every call.\nA clearer picture.", "Review answered calls, stopped calls,\nand messages in one place.", false),
    ("03-call-review", "Understand why\na call stopped.", "See what happened and\nhow to check independently.", true),
    ("04-messages", "Messages,\non your time.", "Review saved notices and voicemail\nwhen it works for you.", false),
    ("05-caretakers", "People you trust.\nOn your terms.", "Choose caretakers. Keep your calls\nand messages private.", true)
]

func rounded(_ rect: CGRect, radius: CGFloat, color: NSColor) {
    color.setFill(); NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}
func text(_ value: String, rect: CGRect, size: CGFloat, color: NSColor, serif: Bool = false) {
    let base = NSFont.systemFont(ofSize: size, weight: serif ? .semibold : .regular)
    let font = serif ? NSFont(descriptor: base.fontDescriptor.withDesign(.serif)!, size: size)! : base
    let style = NSMutableParagraphStyle(); style.lineSpacing = serif ? 0 : 7
    style.lineBreakMode = .byWordWrapping
    let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .paragraphStyle: style]
    let measured = (value as NSString).boundingRect(with: rect.size, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes)
    precondition(measured.height <= rect.height + 1, "Text overflows: \(value)")
    (value as NSString).draw(in: rect, withAttributes: attributes)
}
func render(_ name: String, _ draw: (CGContext) -> Void) throws {
    let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: width * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    context.translateBy(x: 0, y: CGFloat(height)); context.scaleBy(x: 1, y: -1)
    context.scaleBy(x: CGFloat(width) / 1320, y: CGFloat(width) / 1320)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
    draw(context)
    NSGraphicsContext.restoreGraphicsState()
    let destination = CGImageDestinationCreateWithURL(output.appendingPathComponent(name + ".png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
    let origin = "Original Shield marketing layout rendered by scripts/render-app-store-artwork.swift. Native simulator screenshot \(name).png from offline, fictional data. No real account data, third-party artwork, invented UI, or efficacy claims."
    CGImageDestinationAddImage(destination, context.makeImage()!, [kCGImagePropertyPNGDictionary: ["Description": origin]] as CFDictionary)
    precondition(CGImageDestinationFinalize(destination))
}

for (name, title, description, dark) in entries {
    let captureURL = source.appendingPathComponent(name + ".png")
    guard let data = try? Data(contentsOf: captureURL), let bitmap = NSBitmapImageRep(data: data),
          bitmap.pixelsWide == width, bitmap.pixelsHigh == height,
          let screenshot = NSImage(contentsOf: captureURL) else { fatalError("Missing or mismatched native capture: \(name)") }
    try render(name) { context in
        (dark ? navy : paper).setFill(); CGRect(x: 0, y: 0, width: 1320, height: 2880).fill()
        let titleSize: CGFloat = title.contains("Understand") || title.contains("People") ? 112 : 124
        text(title, rect: CGRect(x: 100, y: 110, width: 1120, height: 325), size: titleSize,
             color: dark ? .white : ink, serif: true)
        text(description, rect: CGRect(x: 104, y: 452, width: 1112, height: 140), size: 46,
             color: dark ? pale : NSColor(srgbRed: 0.32, green: 0.37, blue: 0.44, alpha: 1))
        if name == "01-home" {
            text("Subscription and compatible carrier setup required.",
                 rect: CGRect(x: 104, y: 598, width: 1112, height: 38), size: 28, color: pale)
        }

        // A restrained device frame; the screenshot itself is never retouched.
        let screen = CGRect(x: 170, y: 670, width: 980, height: 980 * CGFloat(height) / CGFloat(width))
        let chassis = screen.insetBy(dx: -19, dy: -19)
        NSGraphicsContext.saveGraphicsState()
        let shadow = NSShadow(); shadow.shadowColor = .black.withAlphaComponent(dark ? 0.24 : 0.18)
        shadow.shadowOffset = NSSize(width: 0, height: 18); shadow.shadowBlurRadius = 32; shadow.set()
        rounded(chassis, radius: 118, color: NSColor(white: 0.13, alpha: 1))
        NSGraphicsContext.restoreGraphicsState()
        NSGraphicsContext.saveGraphicsState()
        NSBezierPath(roundedRect: screen, xRadius: 99, yRadius: 99).addClip()
        screenshot.draw(in: screen, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
        NSGraphicsContext.restoreGraphicsState()
        // The simulator omits the physical Dynamic Island; the frame supplies it.
        rounded(CGRect(x: 532, y: screen.minY + 31, width: 256, height: 73), radius: 38, color: .black)
    }
    print("Rendered \(name): \(width) × \(height)")
}

let manifest: [String: Any] = ["width": width, "height": height, "data": "fictional", "screenshots": entries.map { $0.0 + ".png" },
    "source": source.path, "generator": "scripts/render-app-store-artwork.swift", "uploaded": false]
try JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys]).write(to: output.appendingPathComponent("manifest.json"))

// A compact review sheet, separate from the exact-size upload files.
let sheetWidth = 1700, sheetHeight = 780
let sheet = CGContext(data: nil, width: sheetWidth, height: sheetHeight, bitsPerComponent: 8,
    bytesPerRow: sheetWidth * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
sheet.translateBy(x: 0, y: CGFloat(sheetHeight)); sheet.scaleBy(x: 1, y: -1)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(cgContext: sheet, flipped: true)
NSColor.white.setFill(); CGRect(x: 0, y: 0, width: sheetWidth, height: sheetHeight).fill()
for (index, entry) in entries.enumerated() {
    let image = NSImage(contentsOf: output.appendingPathComponent(entry.0 + ".png"))!
    image.draw(in: CGRect(x: CGFloat(20 + index * 336), y: 20, width: 316, height: 316 * CGFloat(height) / CGFloat(width)),
               from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    text(entry.0, rect: CGRect(x: 20 + index * 336, y: 730, width: 316, height: 35), size: 20, color: ink)
}
NSGraphicsContext.restoreGraphicsState()
let sheetDestination = CGImageDestinationCreateWithURL(output.appendingPathComponent("overview.png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(sheetDestination, sheet.makeImage()!, nil)
precondition(CGImageDestinationFinalize(sheetDestination))

// swift scripts/render-app-store-artwork.swift <raw-capture-directory> <output-directory> <width> <height> [lifestyle-asset-directory]
// Composes original marketing pages around unmodified native simulator captures.
import AppKit
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard (5...6).contains(args.count), let width = Int(args[3]), let height = Int(args[4]),
      [(1320, 2868), (1206, 2622)].contains(where: { $0 == (width, height) }) else {
    fatalError("Expected raw directory, output directory, and supported portrait width/height")
}
let source = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[2])
let assets = URL(fileURLWithPath: args.count == 6 ? args[5] : "presentation/app-store/assets")
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let navy = NSColor(srgbRed: 0, green: 0.149, blue: 0.392, alpha: 1)
let paper = NSColor(srgbRed: 0.949, green: 0.953, blue: 0.957, alpha: 1)
let ink = NSColor(srgbRed: 0.063, green: 0.118, blue: 0.196, alpha: 1)
let pale = NSColor(srgbRed: 0.80, green: 0.86, blue: 0.96, alpha: 1)
let entries: [(String, String, Bool)] = [
    ("01-home", "Your calls.\nYour choice.", true),
    ("02-calls", "Calls,\nmade clear.", false),
    ("03-call-review", "Know why\nit stopped.", true),
    ("04-messages", "Messages.\nYour time.", false),
    ("05-caretakers", "People\nyou trust.", true)
]

func rounded(_ rect: CGRect, radius: CGFloat, color: NSColor) {
    color.setFill(); NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}

func photo(_ name: String, rect: CGRect) {
    let url = assets.appendingPathComponent(name + ".png")
    guard let picture = NSImage(contentsOf: url) else { fatalError("Missing lifestyle asset: \(url.path)") }
    // Fit the complete alpha cutout without stretching its proportions.
    let size = picture.size
    let scale = min(rect.width / size.width, rect.height / size.height)
    let fitted = CGRect(x: rect.midX - size.width * scale / 2, y: rect.maxY - size.height * scale,
                        width: size.width * scale, height: size.height * scale)
    picture.draw(in: fitted, from: .zero, operation: .sourceOver, fraction: 1,
                 respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
}

func phone(_ screenshot: NSImage, rect: CGRect, angle: CGFloat = 0) {
    NSGraphicsContext.saveGraphicsState()
    let transform = AffineTransform(translationByX: rect.midX, byY: rect.midY)
    var placement = transform
    placement.rotate(byDegrees: angle)
    placement.translate(x: -rect.midX, y: -rect.midY)
    (placement as NSAffineTransform).concat()
    let scale = rect.width / 980
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow(); shadow.shadowColor = .black.withAlphaComponent(0.22)
    shadow.shadowOffset = NSSize(width: 0, height: 24); shadow.shadowBlurRadius = 42; shadow.set()
    rounded(rect.insetBy(dx: -18 * scale, dy: -18 * scale), radius: 118 * scale,
            color: NSColor(white: 0.13, alpha: 1))
    NSGraphicsContext.restoreGraphicsState()
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect: rect, xRadius: 99 * scale, yRadius: 99 * scale).addClip()
    screenshot.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1,
                    respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
    rounded(CGRect(x: rect.midX - 128 * scale, y: rect.minY + 31 * scale,
                   width: 256 * scale, height: 73 * scale), radius: 38 * scale, color: .black)
    NSGraphicsContext.restoreGraphicsState()
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
    let origin = "Original Shield marketing layout rendered by scripts/render-app-store-artwork.swift. Native simulator screenshot \(name).png from offline fictional data. Transparent people cutouts use fictional AI models edited with built-in image_gen; prompts in presentation/app-store/assets/cutout-prompts.json. No testimonials, real account data, competitor artwork or invented UI."
    CGImageDestinationAddImage(destination, context.makeImage()!, [kCGImagePropertyPNGDictionary: ["Description": origin]] as CFDictionary)
    precondition(CGImageDestinationFinalize(destination))
}

for (name, title, dark) in entries {
    let captureURL = source.appendingPathComponent(name + ".png")
    guard let data = try? Data(contentsOf: captureURL), let bitmap = NSBitmapImageRep(data: data),
          bitmap.pixelsWide == width, bitmap.pixelsHigh == height,
          let screenshot = NSImage(contentsOf: captureURL) else { fatalError("Missing or mismatched native capture: \(name)") }
    try render(name) { context in
        (dark ? navy : paper).setFill(); CGRect(x: 0, y: 0, width: 1320, height: 2880).fill()
        let lifestyle = name == "01-home" || name == "05-caretakers"
        text(title, rect: CGRect(x: 90, y: 100, width: 1140, height: 430), size: 160,
             color: dark ? .white : ink, serif: true)
        if name == "01-home" {
            text("Subscription and compatible carrier setup required.",
                 rect: CGRect(x: 96, y: 570, width: 1128, height: 45), size: 30, color: pale)
        }
        if lifestyle {
            let canvasHeight = CGFloat(height) * 1320 / CGFloat(width)
            let screenWidth: CGFloat = 780
            phone(screenshot, rect: CGRect(x: 470, y: 780, width: screenWidth,
                  height: screenWidth * CGFloat(height) / CGFloat(width)), angle: 3)
            photo(name == "01-home" ? "calm-call-cutout" : "family-moment-cutout",
                  rect: CGRect(x: name == "01-home" ? -230 : -260,
                               y: canvasHeight - 1500, width: name == "01-home" ? 910 : 1450, height: 1500))
        } else {
            let angle: CGFloat = name == "02-calls" ? -4 : (name == "04-messages" ? 4 : 0)
            phone(screenshot, rect: CGRect(x: 170, y: 710, width: 980,
                  height: 980 * CGFloat(height) / CGFloat(width)), angle: angle)
        }
    }
    print("Rendered \(name): \(width) × \(height)")
}

let manifest: [String: Any] = ["width": width, "height": height, "data": "fictional", "screenshots": entries.map { $0.0 + ".png" },
    "source": source.path, "generator": "scripts/render-app-store-artwork.swift", "uploaded": false,
    "lifestyleAssets": assets.path, "people": "Fictional AI models; not customers or testimonials"]
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

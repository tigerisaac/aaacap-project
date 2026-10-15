// Run: swift scripts/generate-setup-guides.swift
// Original, generic instructional artwork. No screenshots or personal data.
import AppKit
import AVFoundation

let output = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("ios/Shield/Resources/SetupGuides")
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let width = 960, height = 640, fps: Int32 = 30, seconds = 12
let navy = NSColor(srgbRed: 0.09, green: 0.16, blue: 0.25, alpha: 1)
let ground = NSColor(srgbRed: 0.95, green: 0.95, blue: 0.96, alpha: 1)
let guides = ["silence", "voicemailOff", "keypad", "never", "voicemailOn"]

func text(_ string: String, _ x: CGFloat, _ y: CGFloat, size: CGFloat = 42, weight: NSFont.Weight = .medium, color: NSColor = .labelColor) {
    let style = NSMutableParagraphStyle()
    style.lineBreakMode = .byWordWrapping
    (string as NSString).draw(in: NSRect(x: x, y: y, width: 860 - x, height: 110), withAttributes: [
        .font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: color, .paragraphStyle: style
    ])
}
func roundRect(_ rect: NSRect, radius: CGFloat, color: NSColor) {
    color.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}
func symbol(_ name: String, rect: NSRect, color: NSColor) {
    guard let image = NSImage(systemSymbolName: name, accessibilityDescription: nil)?
        .withSymbolConfiguration(.init(pointSize: rect.height, weight: .semibold)) else { return }
    image.isTemplate = true
    color.set()
    image.draw(in: rect)
}
func draw(_ guide: String, time: Double, still: Bool) {
    ground.setFill(); NSRect(x: 0, y: 0, width: width, height: height).fill()
    text(guide == "keypad" ? "In the Phone app" : "In Phone settings", 40, 22, size: 44, weight: .bold, color: navy)
    let target = guide == "silence" ? "Silence" : guide == "never" ? "Never" : guide == "voicemailOn" ? "On" : "Off"
    let titles = guide == "keypad" ? ["Tap Keypad", "Tap above numbers, then Paste", "Tap Call, then return to Shield"] : [
        guide == "silence" || guide == "never" ? "Screen Unknown Callers" : "Live Voicemail",
        guide == "silence" || guide == "never" ? "Choose \(target)" : "Turn Live Voicemail \(target.lowercased())",
        "Return to Shield"
    ]
    for index in 0..<3 {
        let y = CGFloat(110 + index * 172)
        roundRect(NSRect(x: 28, y: y, width: 904, height: 150), radius: 22, color: .white)
        text(String(index + 1), 52, y + 45, size: 42, weight: .bold, color: navy)
        let titleWidth = guide == "keypad" && index > 0 ? CGFloat(630) : CGFloat(670)
        let style = NSMutableParagraphStyle(); style.lineBreakMode = .byWordWrapping
        (titles[index] as NSString).draw(in: NSRect(x: 112, y: y + 35, width: titleWidth, height: 105), withAttributes: [
            .font: NSFont.systemFont(ofSize: 42, weight: .semibold), .foregroundColor: navy, .paragraphStyle: style
        ])
        let targetX: CGFloat = 846
        if index == 0 {
            symbol(guide == "keypad" ? "circle.grid.3x3.fill" : "chevron.right", rect: NSRect(x: 824, y: y + 54, width: 42, height: 42), color: navy)
        } else if index == 1 && guide == "keypad" {
            roundRect(NSRect(x: 760, y: y + 44, width: 145, height: 62), radius: 14, color: navy)
            text("Paste", 774, y + 53, size: 31, weight: .semibold, color: .white)
        } else if index == 1 && (guide == "voicemailOff" || guide == "voicemailOn") {
            let on = guide == "voicemailOn"
            roundRect(NSRect(x: 784, y: y + 44, width: 112, height: 64), radius: 32,
                      color: on ? NSColor(srgbRed: 0.1, green: 0.55, blue: 0.27, alpha: 1) : .systemGray)
            roundRect(NSRect(x: on ? 836 : 790, y: y + 50, width: 52, height: 52), radius: 26, color: .white)
        } else if index == 2 && guide == "keypad" {
            roundRect(NSRect(x: 802, y: y + 34, width: 90, height: 90), radius: 45,
                      color: NSColor(srgbRed: 0.1, green: 0.55, blue: 0.27, alpha: 1))
            symbol("phone.fill", rect: NSRect(x: 827, y: y + 59, width: 40, height: 40), color: .white)
        } else {
            symbol(index == 1 ? "checkmark" : "arrow.uturn.backward", rect: NSRect(x: 824, y: y + 54, width: 42, height: 42), color: navy)
        }
        if !still {
            let local = time - Double(index * 4)
            // Only the tap indicator changes. Labels and controls never slide.
            let fade = min(1, max(0, local / 0.2)) * min(1, max(0, (4 - local) / 0.2))
            if fade > 0 {
                let outline = NSBezierPath(roundedRect: NSRect(x: 30, y: y + 2, width: 900, height: 146), xRadius: 20, yRadius: 20)
                navy.withAlphaComponent(fade).setStroke(); outline.lineWidth = 4; outline.stroke()
                let tapProgress = min(1, max(0, (local - 1.2) / 0.5))
                if local >= 1.2 && local < 2.1 {
                    let radius = 25 + 18 * tapProgress
                    let ring = NSBezierPath(ovalIn: NSRect(x: targetX - radius, y: y + 76 - radius, width: radius * 2, height: radius * 2))
                    navy.withAlphaComponent((1 - tapProgress) * 0.75).setStroke(); ring.lineWidth = 6; ring.stroke()
                }
            }
        }
    }
}

for guide in guides {
    for still in [false, true] {
        let url = output.appendingPathComponent("setup-\(guide)\(still ? "-still" : "").mp4")
        try? FileManager.default.removeItem(at: url)
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 600_000, AVVideoMaxKeyFrameIntervalKey: 30]
        ])
        input.expectsMediaDataInRealTime = false
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
            kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
            kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
        ])
        writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
        for frame in 0..<(seconds * Int(fps)) {
            while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
            autoreleasepool {
                var buffer: CVPixelBuffer?
                CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
                let pixel = buffer!
                CVPixelBufferLockBaseAddress(pixel, [])
                let context = CGContext(data: CVPixelBufferGetBaseAddress(pixel), width: width, height: height,
                    bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixel), space: CGColorSpaceCreateDeviceRGB(),
                    bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
                context.translateBy(x: 0, y: CGFloat(height)); context.scaleBy(x: 1, y: -1)
                NSGraphicsContext.saveGraphicsState()
                NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
                draw(guide, time: Double(frame) / Double(fps), still: still)
                if frame == 0 && still, let image = context.makeImage() {
                    let bitmap = NSBitmapImageRep(cgImage: image)
                    try! bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("setup-\(guide)-poster.png"))
                }
                NSGraphicsContext.restoreGraphicsState()
                CVPixelBufferUnlockBaseAddress(pixel, [])
                precondition(adaptor.append(pixel, withPresentationTime: CMTime(value: Int64(frame), timescale: fps)))
            }
        }
        input.markAsFinished()
        let done = DispatchSemaphore(value: 0)
        writer.finishWriting { done.signal() }; done.wait()
        precondition(writer.status == .completed, "Guide encoding failed")
        // AVKit's background playback uses an actual, silent audio track.
        let muxed = url.deletingPathExtension().appendingPathExtension("mux.mp4")
        let process = Process(); process.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/ffmpeg")
        process.arguments = ["-hide_banner", "-loglevel", "error", "-y", "-i", url.path, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-c:v", "copy", "-c:a", "aac", "-b:a", "32k", "-shortest", "-movflags", "+faststart", muxed.path]
        try process.run(); process.waitUntilExit(); precondition(process.terminationStatus == 0)
        try FileManager.default.removeItem(at: url); try FileManager.default.moveItem(at: muxed, to: url)
        print(url.lastPathComponent)
    }
}

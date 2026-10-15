// Run: swift scripts/generate-setup-guides.swift
// Original, generic instructional artwork. No screenshots or personal data.
import AppKit
import AVFoundation

let output = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("ios/Shield/Resources/SetupGuides")
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let width = 960, height = 640, fps: Int32 = 30
let navy = NSColor(srgbRed: 0.06, green: 0.12, blue: 0.20, alpha: 1)
let ground = NSColor(srgbRed: 0.95, green: 0.95, blue: 0.97, alpha: 1)
let blue = NSColor(srgbRed: 0, green: 0.32, blue: 0.85, alpha: 1)
let green = NSColor(srgbRed: 0.08, green: 0.52, blue: 0.22, alpha: 1)
let guides = ["silence", "voicemailOff", "keypad", "never", "voicemailOn"]
    .filter { CommandLine.arguments.count == 1 || CommandLine.arguments.dropFirst().contains($0) }

// Close-ups preserve the native labels, order, control shapes and outcomes.
// The artwork contains no phone number, carrier code, or purported carrier result.
func text(_ string: String, _ rect: NSRect, size: CGFloat = 48,
          weight: NSFont.Weight = .regular, color: NSColor = navy,
          alignment: NSTextAlignment = .left) {
    let style = NSMutableParagraphStyle()
    style.lineBreakMode = .byWordWrapping
    style.alignment = alignment
    (string as NSString).draw(in: rect, withAttributes: [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color, .paragraphStyle: style
    ])
}
func roundRect(_ rect: NSRect, radius: CGFloat, color: NSColor) {
    color.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}
func symbol(_ name: String, rect: NSRect, color: NSColor) {
    guard let source = NSImage(systemSymbolName: name, accessibilityDescription: nil)?
        .withSymbolConfiguration(.init(pointSize: rect.height, weight: .semibold)) else { return }
    // Render a fixed tint instead of relying on the generating Mac's appearance.
    let tinted = NSImage(size: rect.size)
    tinted.lockFocus()
    source.draw(in: NSRect(origin: .zero, size: rect.size))
    color.setFill()
    NSRect(origin: .zero, size: rect.size).fill(using: .sourceIn)
    tinted.unlockFocus()
    tinted.draw(in: rect)
}
func caption(_ string: String) {
    navy.setFill(); NSRect(x: 0, y: 0, width: width, height: 112).fill()
    text(string, NSRect(x: 32, y: 24, width: 896, height: 78), size: 52, weight: .semibold, color: .white)
}
func phoneHeader(_ title: String = "Phone") {
    text(title, NSRect(x: 80, y: 138, width: 800, height: 56), size: 38, weight: .semibold, alignment: .center)
}
func separator(_ y: CGFloat) {
    NSColor(srgbRed: 0.81, green: 0.82, blue: 0.84, alpha: 1).setFill()
    NSRect(x: 82, y: y, width: 796, height: 1).fill()
}
func tap(_ point: NSPoint, local: Double) {
    guard (0.8..<2.5).contains(local) else { return }
    let fade = min(1, (local - 0.8) / 0.2) * min(1, (2.5 - local) / 0.2)
    let press = max(0, 1 - abs(local - 1.7) / 0.35)
    let radius = 37 - 8 * press
    let ring = NSBezierPath(ovalIn: NSRect(x: point.x - radius, y: point.y - radius, width: radius * 2, height: radius * 2))
    NSColor.white.withAlphaComponent(fade).setStroke(); ring.lineWidth = 14; ring.stroke()
    navy.withAlphaComponent(fade).setStroke(); ring.lineWidth = 7; ring.stroke()
    roundRect(NSRect(x: point.x - 7, y: point.y - 7, width: 14, height: 14), radius: 7, color: navy.withAlphaComponent(fade))
}
func choices(_ guide: String, time: Double, still: Bool) {
    let target = guide == "silence" ? "Silence" : "Never"
    let selected = still || time >= 7
    caption(still ? "Choose \(target)" : time < 5 ? "Find Screen Unknown Callers" : time < 11 ? "Tap \(target)" : time < 16 ? "Look for the checkmark" : "Return to Shield")
    phoneHeader()
    text("Screen Unknown Callers", NSRect(x: 80, y: 222, width: 820, height: 64), size: 48, weight: .semibold)
    roundRect(NSRect(x: 48, y: 302, width: 864, height: 300), radius: 26, color: .white)
    for (index, label) in ["Never", "Ask Reason for Calling", "Silence"].enumerated() {
        let y = CGFloat(302 + index * 100)
        text(label, NSRect(x: 82, y: y + 22, width: 735, height: 64), size: 46)
        if index < 2 { separator(y + 100) }
        if selected && label == target {
            symbol("checkmark", rect: NSRect(x: 840, y: y + 30, width: 38, height: 38), color: blue)
        }
    }
    if !still {
        tap(NSPoint(x: 792, y: guide == "silence" ? 552 : 352), local: time - 5)
    }
}
func voicemail(_ guide: String, time: Double, still: Bool) {
    let wantsOn = guide == "voicemailOn"
    let changed = still || time >= 9
    let on = changed ? wantsOn : !wantsOn
    let action = wantsOn ? "Turn it on if it’s gray" : "Turn it off if it’s green"
    let result = wantsOn ? "Green means on. Leave it on." : "Gray means off. Leave it off."
    caption(still ? "Leave Live Voicemail \(wantsOn ? "on" : "off")" : time < 6 ? "Find Live Voicemail" : time < 12 ? action : time < 18 ? result : "Return to Shield")
    // Live Voicemail is an inline switch on the Phone settings page.
    // Never invent a detail page or a chevron that the phone does not have.
    phoneHeader()
    roundRect(NSRect(x: 48, y: 310, width: 864, height: 124), radius: 26, color: .white)
    text("Live Voicemail", NSRect(x: 82, y: 341, width: 620, height: 70), size: 50)
    let toggle = NSRect(x: 740, y: 335, width: 136, height: 76)
    roundRect(toggle, radius: 38, color: on ? green : NSColor(srgbRed: 0.55, green: 0.56, blue: 0.58, alpha: 1))
    let progress = still ? 1 : min(1, max(0, (time - 9) / 0.25))
    let fraction = wantsOn ? progress : 1 - progress
    roundRect(NSRect(x: 746 + 60 * fraction, y: 341, width: 64, height: 64), radius: 32, color: .white)
    if !still { tap(NSPoint(x: 808, y: 373), local: time - 7) }
}

func keypad(time: Double, still: Bool) {
    if !still && time < 4 {
        caption("Tap Keypad in Phone")
        phoneHeader()
        // Native Phone navigation, cropped to the three tabs and Search.
        roundRect(NSRect(x: 42, y: 312, width: 716, height: 176), radius: 70, color: .white)
        for (index, label) in ["Calls", "Contacts", "Keypad"].enumerated() {
            let x = CGFloat(164 + index * 228)
            let color = index == 2 && time >= 2 ? blue : navy
            symbol(["clock.fill", "person.crop.circle", "circle.grid.3x3.fill"][index],
                   rect: NSRect(x: x - 29, y: 338, width: 58, height: 58), color: color)
            text(label, NSRect(x: x - 108, y: 416, width: 216, height: 62),
                 size: 42, color: color, alignment: .center)
        }
        roundRect(NSRect(x: 784, y: 322, width: 154, height: 154), radius: 77, color: .white)
        symbol("magnifyingglass", rect: NSRect(x: 827, y: 365, width: 68, height: 68), color: navy)
        tap(NSPoint(x: 680, y: 370), local: time)
        return
    }
    let pasted = !still && time >= 11
    let menu = still || (6..<11).contains(time)
    caption(still ? "Tap above numbers, then Paste" : time < 4 ? "Open Keypad in Phone" : time < 9 ? "Tap the blank space" : time < 15 ? "Tap Paste" : time < 18 ? "Tap the green Call button" : time < 26 ? "Wait for your carrier’s result" : "Return to Shield")
    text("Keypad", NSRect(x: 80, y: 125, width: 800, height: 46), size: 32, weight: .semibold, alignment: .center)
    if pasted {
        text("Your copied code", NSRect(x: 200, y: 183, width: 560, height: 60), size: 44, alignment: .center)
    }
    // The empty area above the digits is the real paste target, not a keypad key.
    if menu {
        roundRect(NSRect(x: 378, y: 176, width: 204, height: 74), radius: 18, color: navy)
        text("Paste", NSRect(x: 390, y: 188, width: 180, height: 60), size: 44, weight: .medium, color: .white, alignment: .center)
    }
    let keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]
    for (index, label) in keys.enumerated() {
        let x = CGFloat(330 + (index % 3) * 150), y = CGFloat(282 + (index / 3) * 80)
        roundRect(NSRect(x: x - 36, y: y - 36, width: 72, height: 72), radius: 36,
                  color: NSColor(srgbRed: 0.86, green: 0.87, blue: 0.89, alpha: 1))
        text(label, NSRect(x: x - 34, y: y - 31, width: 68, height: 65), size: 50, alignment: .center)
    }
    roundRect(NSRect(x: 445, y: 567, width: 70, height: 70), radius: 35, color: green)
    symbol("phone.fill", rect: NSRect(x: 463, y: 585, width: 34, height: 34), color: .white)
    if !still {
        if time < 9 { tap(NSPoint(x: 480, y: 211), local: time - 4) }
        else if time < 15 { tap(NSPoint(x: 540, y: 213), local: time - 9) }
        else if time < 18 { tap(NSPoint(x: 480, y: 602), local: time - 15) }
    }
}
func draw(_ guide: String, time: Double, still: Bool) {
    ground.setFill(); NSRect(x: 0, y: 0, width: width, height: height).fill()
    if guide == "silence" || guide == "never" { choices(guide, time: time, still: still) }
    else if guide == "keypad" { keypad(time: time, still: still) }
    else { voicemail(guide, time: time, still: still) }
}

for guide in guides {
    let seconds = guide == "keypad" ? 30 : guide.hasPrefix("voicemail") ? 24 : 22
    for still in [false, true] {
        let url = output.appendingPathComponent("setup-\(guide)\(still ? "-still" : "").mp4")
        try? FileManager.default.removeItem(at: url)
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 900_000, AVVideoMaxKeyFrameIntervalKey: 30]
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

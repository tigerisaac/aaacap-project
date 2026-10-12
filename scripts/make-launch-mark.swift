// Derives LaunchMark.png (the Shield icon with iOS app-icon continuous corners and a
// transparent outside) from ShieldMark.png. Launch storyboards can't clip images reliably,
// so the rounded shape is baked into the asset.
// Usage: swift scripts/make-launch-mark.swift <ShieldMark.png> <LaunchMark.png>
import CoreGraphics
import Foundation
import ImageIO
import SwiftUI
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3,
      let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fatalError("usage: make-launch-mark.swift <input.png> <output.png>")
}
let size = CGFloat(image.width)
let r = size * 0.2237 // App icon corner radius ratio.

// SwiftUI's continuous corner style is the same curve iOS uses for app icons.
let path = RoundedRectangle(cornerRadius: r, style: .continuous)
    .path(in: CGRect(x: 0, y: 0, width: size, height: size)).cgPath

let context = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
context.addPath(path)
context.clip()
context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, context.makeImage()!, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("Couldn't write \(args[2])") }

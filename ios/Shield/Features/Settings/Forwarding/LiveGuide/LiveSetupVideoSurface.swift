#if DEBUG
import AVKit
import SwiftUI

struct LiveSetupVideoSurface: UIViewRepresentable {
    let guide: LiveSetupFloatingGuide

    func makeUIView(context: Context) -> Surface {
        let view = Surface()
        view.guide = guide
        view.isAccessibilityElement = false
        return view
    }
    func updateUIView(_ view: Surface, context: Context) { view.guide = guide; view.attach() }

    final class Surface: UIView {
        weak var guide: LiveSetupFloatingGuide?
        override class var layerClass: AnyClass { AVSampleBufferDisplayLayer.self }
        override func layoutSubviews() { super.layoutSubviews(); attach() }
        override func didMoveToWindow() { super.didMoveToWindow(); attach() }
        func attach() {
            guard window != nil, bounds.width > 0, bounds.height > 0,
                  let display = layer as? AVSampleBufferDisplayLayer else { return }
            display.videoGravity = .resizeAspect
            guide?.attach(display)
        }
    }
}
#endif

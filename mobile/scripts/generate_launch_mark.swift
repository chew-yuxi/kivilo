import AppKit

let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let scales = [("LaunchImage.png", 72), ("LaunchImage@2x.png", 144), ("LaunchImage@3x.png", 216)]

for (filename, size) in scales {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()
    NSColor(calibratedRed: 236 / 255, green: 72 / 255, blue: 153 / 255, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: size, height: size),
                 xRadius: CGFloat(size) * 0.28, yRadius: CGFloat(size) * 0.28).fill()
    NSColor.white.setFill()
    let dot = CGFloat(size) * 0.36
    NSBezierPath(ovalIn: NSRect(x: (CGFloat(size) - dot) / 2,
                              y: (CGFloat(size) - dot) / 2,
                              width: dot, height: dot)).fill()
    image.unlockFocus()

    guard let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff),
          let png = bitmap.representation(using: .png, properties: [:]) else {
        fatalError("Could not render \(filename)")
    }
    try png.write(to: output.appendingPathComponent(filename))
}

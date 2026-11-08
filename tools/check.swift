// 把透明立绘铺在深色底上导出，方便检查白边：check <in.png> <out.jpg>
import Foundation
import CoreImage
import CoreGraphics
let a = CommandLine.arguments
guard a.count >= 3, let img = CIImage(contentsOf: URL(fileURLWithPath: a[1])) else { exit(1) }
let bg = CIImage(color: CIColor(red: 0.16, green: 0.18, blue: 0.24)).cropped(to: img.extent)
let out = img.composited(over: bg)
let ctx = CIContext()
try ctx.writeJPEGRepresentation(of: out, to: URL(fileURLWithPath: a[2]), colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.9])

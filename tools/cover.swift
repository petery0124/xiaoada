// 生成微信分享封面：swift tools/cover.swift 立绘.png 输出.jpg
import Foundation
import CoreImage
import CoreGraphics

let args = CommandLine.arguments
guard args.count >= 3, let look = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else { print("usage: cover <look.png> <out.jpg>"); exit(1) }
let size: CGFloat = 900
let bgRect = CGRect(x: 0, y: 0, width: size, height: size)
let grad = CIFilter(name: "CILinearGradient")!
grad.setValue(CIVector(x: 0, y: size), forKey: "inputPoint0")
grad.setValue(CIVector(x: size, y: 0), forKey: "inputPoint1")
grad.setValue(CIColor(red: 1.0, green: 0.93, blue: 0.95), forKey: "inputColor0")
grad.setValue(CIColor(red: 1.0, green: 0.96, blue: 0.90), forKey: "inputColor1")
let bg = grad.outputImage!.cropped(to: bgRect)
// 立绘等比缩放到高度 = 画布高度的 96%，居中
let scale = (size * 0.96) / look.extent.height
let scaled = look.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
let dx = (size - scaled.extent.width) / 2 - scaled.extent.minX, dy = size * 0.02 - scaled.extent.minY
let placed = scaled.transformed(by: CGAffineTransform(translationX: dx, y: dy))
let out = placed.composited(over: bg).cropped(to: bgRect)
let ctx = CIContext()
try ctx.writeJPEGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.86])
print("ok")

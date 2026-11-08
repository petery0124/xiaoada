// 用 macOS 自带的 Vision 主体识别抠图：swift tools/cutout.swift 输入 输出.png
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: cutout <in> <out.png>"); exit(1) }
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
guard let img = CIImage(contentsOf: inURL) else { print("cannot read \(args[1])"); exit(1) }
let handler = VNImageRequestHandler(ciImage: img, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([req]) } catch { print("vision failed: \(error)"); exit(2) }
guard let res = req.results?.first else { print("no subject found"); exit(3) }
let maskPB = try res.generateScaledMaskForImage(forInstances: res.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: maskPB)
let blend = CIFilter(name: "CIBlendWithMask")!
blend.setValue(img, forKey: kCIInputImageKey)
blend.setValue(CIImage(color: .clear).cropped(to: img.extent), forKey: kCIInputBackgroundImageKey)
blend.setValue(mask, forKey: kCIInputMaskImageKey)
let out = blend.outputImage!.cropped(to: img.extent)
let ctx = CIContext()
try ctx.writePNGRepresentation(of: out, to: outURL, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, options: [:])
print("ok \(Int(img.extent.width))x\(Int(img.extent.height))")

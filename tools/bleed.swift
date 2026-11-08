// 边缘补色：把人物边缘的颜色向外填充到全透明像素里，再写成“非预乘”的 PNG。
// 这样后面做有损压缩或缩放时，边缘不会和黑色/白色底混出毛边和色块。可见像素一个都不改。
// 用法：bleed <in.png> <out.png>
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count >= 3, let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("cannot read"); exit(1) }
let w = cg.width, h = cg.height, n = w * h
var pm = [UInt8](repeating: 0, count: n * 4)
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
pm.withUnsafeMutableBytes { buf in
  let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue)!
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
}
// 反预乘得到真实颜色
var rgb = [UInt8](repeating: 0, count: n * 3), alpha = [UInt8](repeating: 0, count: n)
var filled = [Bool](repeating: false, count: n)
for i in 0..<n {
  let al = Int(pm[i * 4 + 3]); alpha[i] = UInt8(al)
  if al > 0 {
    for c in 0..<3 { rgb[i * 3 + c] = UInt8(min(255, Int(pm[i * 4 + c]) * 255 / al)) }
    filled[i] = true
  }
}
// 逐层向外扩散：每一轮把已填色像素的平均色给相邻的未填色像素
var frontier = [Int](); frontier.reserveCapacity(n / 8)
for i in 0..<n where filled[i] {
  let x = i % w, y = i / w
  if (x > 0 && !filled[i - 1]) || (x < w - 1 && !filled[i + 1]) || (y > 0 && !filled[i - w]) || (y < h - 1 && !filled[i + w]) { frontier.append(i) }
}
var rounds = 0
while !frontier.isEmpty && rounds < 64 {
  rounds += 1
  var next = [Int](); var newly = [Int: (Int, Int, Int, Int)]()
  for i in frontier {
    let x = i % w, y = i / w
    let nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
    for j in nb where j >= 0 && !filled[j] {
      var e = newly[j] ?? (0, 0, 0, 0)
      e.0 += Int(rgb[i * 3]); e.1 += Int(rgb[i * 3 + 1]); e.2 += Int(rgb[i * 3 + 2]); e.3 += 1
      newly[j] = e
    }
  }
  for (j, e) in newly {
    rgb[j * 3] = UInt8(e.0 / e.3); rgb[j * 3 + 1] = UInt8(e.1 / e.3); rgb[j * 3 + 2] = UInt8(e.2 / e.3)
    filled[j] = true; next.append(j)
  }
  frontier = next
}
// 还没填到的远处：用整体平均色（远离人物，不影响边缘）
var sr = 0, sg = 0, sb = 0, cnt = 0
for i in 0..<n where alpha[i] > 128 { sr += Int(rgb[i * 3]); sg += Int(rgb[i * 3 + 1]); sb += Int(rgb[i * 3 + 2]); cnt += 1 }
let avg = cnt > 0 ? (UInt8(sr / cnt), UInt8(sg / cnt), UInt8(sb / cnt)) : (128, 128, 128)
for i in 0..<n where !filled[i] { rgb[i * 3] = avg.0; rgb[i * 3 + 1] = avg.1; rgb[i * 3 + 2] = avg.2 }
// 写非预乘 RGBA PNG
var out = [UInt8](repeating: 0, count: n * 4)
for i in 0..<n { out[i * 4] = rgb[i * 3]; out[i * 4 + 1] = rgb[i * 3 + 1]; out[i * 4 + 2] = rgb[i * 3 + 2]; out[i * 4 + 3] = alpha[i] }
let data = Data(out)
guard let provider = CGDataProvider(data: data as CFData),
      let img = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4, space: cs,
                        bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue | CGBitmapInfo.byteOrder32Big.rawValue),
                        provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent),
      let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { print("write failed"); exit(2) }
CGImageDestinationAddImage(dest, img, nil)
guard CGImageDestinationFinalize(dest) else { print("finalize failed"); exit(3) }
print("ok \(w)x\(h) rounds=\(rounds)")

// 去白边：透明图最外圈常有一条 1~2 像素、比内侧亮得多的浅灰白线（抠图时混进去的白底）。
// 做法：找出紧贴透明区的边缘像素，和内侧 9x9 范围里不透明像素的平均色比较，
// 亮出多少就当掺了多少白，按比例把它变透明，颜色换成内侧颜色。白衣服边缘和内侧一样亮，不会被动。
// 用法：defringe <in.png> <out.png>
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
var r = [Int](repeating: 0, count: n), g = [Int](repeating: 0, count: n), b = [Int](repeating: 0, count: n), al = [Int](repeating: 0, count: n)
for i in 0..<n {
  let A = Int(pm[i * 4 + 3]); al[i] = A
  if A > 0 { r[i] = min(255, Int(pm[i * 4]) * 255 / A); g[i] = min(255, Int(pm[i * 4 + 1]) * 255 / A); b[i] = min(255, Int(pm[i * 4 + 2]) * 255 / A) }
}
@inline(__always) func lum(_ i: Int) -> Double { 0.299 * Double(r[i]) + 0.587 * Double(g[i]) + 0.114 * Double(b[i]) }
let OUT = 32          // alpha 低于这个算"外面"
@inline(__always) func idx(_ x: Int, _ y: Int) -> Int { y * w + x }
var changed = 0, removed = 0
// 两轮：第一轮去掉最外圈，第二轮处理露出来的下一圈
for pass in 0..<3 {
  var outside = [Bool](repeating: false, count: n)
  for i in 0..<n { outside[i] = al[i] < OUT }
  // 到外面的距离（1、2、3 像素），用三次膨胀算
  var dist = [UInt8](repeating: 0, count: n)   // 0 = 不在边缘带
  var cur = outside
  for d in 1...3 {
    var nxt = cur
    for y in 0..<h { for x in 0..<w {
      let i = idx(x, y); if cur[i] { continue }
      var touch = false
      for dy in -1...1 where !touch { for dx in -1...1 {
        let nx = x + dx, ny = y + dy
        if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
        if cur[idx(nx, ny)] { touch = true; break }
      } }
      if touch { nxt[i] = true; if dist[i] == 0 { dist[i] = UInt8(d) } }
    } }
    cur = nxt
  }
  var nr = r, ng = g, nb = b, na = al
  for i in 0..<n where !outside[i] && (dist[i] > 0 || al[i] < 250) {
    let x = i % w, y = i / w
    // 内侧参考色：9x9 里不在边缘带的不透明像素，取亮度偏暗的那四分之一位置（避免被旁边的白衣服拉高）
    var lums = [(Double, Int)]()
    for dy in -4...4 { for dx in -4...4 {
      let nx = x + dx, ny = y + dy
      if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
      let j = idx(nx, ny)
      if dist[j] == 0 && !outside[j] && al[j] >= 250 { lums.append((lum(j), j)) }
    } }
    if lums.count < 3 { continue }
    lums.sort { $0.0 < $1.0 }
    let q = lums[lums.count / 4]  // 25% 分位
    let j = q.1, lref = q.0, lp = lum(i)
    var f = (lp - lref) / max(1, 255 - lref)
    let weight: Double = dist[i] == 1 || al[i] < 250 ? 1.0 : (dist[i] == 2 ? 0.8 : 0.5)
    f = min(1, f) * weight
    if f < 0.06 { continue }
    nr[i] = r[j]; ng[i] = g[j]; nb[i] = b[j]
    let newA = Int(Double(al[i]) * (1 - f))
    na[i] = newA < 16 ? 0 : newA
    changed += 1; if na[i] == 0 { removed += 1 }
  }
  r = nr; g = ng; b = nb; al = na
  _ = pass
}
// 最外圈柔化半个像素：alpha 取自己和 3x3 最小值的平均
do {
  var na = al
  for y in 0..<h { for x in 0..<w {
    let i = idx(x, y); if al[i] == 0 { continue }
    var m = al[i]
    for dy in -1...1 { for dx in -1...1 {
      let nx = x + dx, ny = y + dy
      if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
      m = min(m, al[idx(nx, ny)])
    } }
    if m == al[i] { continue }
    // 看这个边缘像素是不是比周围（3x3 里更不透明的点）亮
    var lsum = 0.0, lc = 0.0
    for dy in -1...1 { for dx in -1...1 {
      let nx = x + dx, ny = y + dy
      if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
      let j = idx(nx, ny); if j != i && al[j] > al[i] { lsum += lum(j); lc += 1 }
    } }
    let lighter = lc > 0 && lum(i) > lsum / lc + 18
    na[i] = lighter ? m : (al[i] + m) / 2
  } }
  al = na
}
let nr = r, ng = g, nb = b, na = al
// 写非预乘 PNG
var out = [UInt8](repeating: 0, count: n * 4)
for i in 0..<n { out[i * 4] = UInt8(nr[i]); out[i * 4 + 1] = UInt8(ng[i]); out[i * 4 + 2] = UInt8(nb[i]); out[i * 4 + 3] = UInt8(na[i]) }
let data = Data(out)
guard let provider = CGDataProvider(data: data as CFData),
      let img = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4, space: cs,
                        bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue | CGBitmapInfo.byteOrder32Big.rawValue),
                        provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent),
      let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { print("write failed"); exit(2) }
CGImageDestinationAddImage(dest, img, nil)
guard CGImageDestinationFinalize(dest) else { print("finalize failed"); exit(3) }
print("ok \(w)x\(h) edge-pixels-fixed=\(changed) removed=\(removed)")

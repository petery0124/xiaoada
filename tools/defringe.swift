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
let OUT = 64          // alpha 低于这个算"外面"（缝隙里的半透明白雾也算）
@inline(__always) func idx(_ x: Int, _ y: Int) -> Int { y * w + x }
var changed = 0, removed = 0
@inline(__always) func lumRGB(_ rr: Int, _ gg: Int, _ bb: Int) -> Double { 0.299 * Double(rr) + 0.587 * Double(gg) + 0.114 * Double(bb) }
// 三轮：每轮找出边缘带（离透明区 1~3px，或本身半透明），颜色改成最近的"实心像素"的颜色；
// 比那个实心像素亮出多少，就当掺了多少白，按比例降低透明度
for _ in 0..<3 {
  var outside = [Bool](repeating: false, count: n)
  for i in 0..<n { outside[i] = al[i] < OUT }
  var dist = [UInt8](repeating: 0, count: n)
  var cur = outside
  for d in 1...3 {
    var nxt = cur
    for y in 0..<h { for x in 0..<w {
      let i = idx(x, y); if cur[i] { continue }
      var touch = false
      outer: for dy in -1...1 { for dx in -1...1 {
        let nx = x + dx, ny = y + dy
        if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
        if cur[idx(nx, ny)] { touch = true; break outer }
      } }
      if touch { nxt[i] = true; if dist[i] == 0 { dist[i] = UInt8(d) } }
    } }
    cur = nxt
  }
  // 实心像素：不透明且不在边缘带里。从它们出发向外一层层传颜色（多源 BFS），得到每个边缘像素最近的实心色
  var srcOf = [Int32](repeating: -1, count: n)
  var frontier = [Int]()
  for i in 0..<n where !outside[i] && dist[i] == 0 && al[i] >= 250 {
    srcOf[i] = Int32(i)
    let x = i % w, y = i / w
    if (x > 0 && srcOf[i - 1] < 0 && !outside[i - 1]) || (x < w - 1 && !outside[i + 1]) || (y > 0 && !outside[i - w]) || (y < h - 1 && !outside[i + w]) { frontier.append(i) }
  }
  var steps = 0
  while !frontier.isEmpty && steps < 8 {
    steps += 1; var next = [Int]()
    for i in frontier {
      let x = i % w, y = i / w
      for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)] {
        let nx = x + dx, ny = y + dy
        if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
        let j = idx(nx, ny)
        if outside[j] || srcOf[j] >= 0 { continue }
        srcOf[j] = srcOf[i]; next.append(j)
      }
    }
    frontier = next
  }
  var nr = r, ng = g, nb = b, na = al
  for i in 0..<n where !outside[i] && (dist[i] > 0 || al[i] < 250) {
    let sj = Int(srcOf[i]); if sj < 0 || sj == i { continue }
    let lref = lum(sj), lp = lum(i)
    var f = (lp - lref) / max(1, 255 - lref)
    let weight: Double = dist[i] == 1 || al[i] < 250 ? 1.0 : (dist[i] == 2 ? 0.8 : 0.5)
    f = max(0, min(1, f)) * weight
    nr[i] = r[sj]; ng[i] = g[sj]; nb[i] = b[sj]
    if f >= 0.06 {
      let newA = Int(Double(al[i]) * (1 - f)); na[i] = newA < 16 ? 0 : newA
      changed += 1; if na[i] == 0 { removed += 1 }
    }
  }
  r = nr; g = ng; b = nb; al = na
}
// 整个轮廓向内收一个像素（3x3 取最小 alpha），把最外圈那层像素整体去掉
do {
  var na = al
  for y in 0..<h { for x in 0..<w {
    let i = idx(x, y); if al[i] == 0 { continue }
    var m = al[i]
    for dy in -1...1 { for dx in -1...1 {
      let nx = x + dx, ny = y + dy
      if nx < 0 || ny < 0 || nx >= w || ny >= h { m = 0; continue }
      m = min(m, al[idx(nx, ny)])
    } }
    na[i] = m
  } }
  al = na
}
// 收完之后新露出来的边缘，颜色再继承一次实心色
do {
  var outside = [Bool](repeating: false, count: n)
  for i in 0..<n { outside[i] = al[i] < OUT }
  var srcOf = [Int32](repeating: -1, count: n); var frontier = [Int]()
  for i in 0..<n where !outside[i] && al[i] >= 250 {
    let x = i % w, y = i / w; var edge = false
    for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
      let nx = x + dx, ny = y + dy
      if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
      let j = idx(nx, ny); if outside[j] || al[j] < 250 { edge = true }
    }
    if !edge { srcOf[i] = Int32(i); frontier.append(i) }
  }
  var steps = 0
  while !frontier.isEmpty && steps < 6 {
    steps += 1; var next = [Int]()
    for i in frontier {
      let x = i % w, y = i / w
      for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)] {
        let nx = x + dx, ny = y + dy
        if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
        let j = idx(nx, ny); if outside[j] || srcOf[j] >= 0 { continue }
        srcOf[j] = srcOf[i]; next.append(j)
      }
    }
    frontier = next
  }
  for i in 0..<n where !outside[i] { let sj = Int(srcOf[i]); if sj >= 0 && sj != i { r[i] = r[sj]; g[i] = g[sj]; b[i] = b[sj] } }
}
// 再柔化半个像素，边缘不发硬
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
    na[i] = (al[i] + m) / 2
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

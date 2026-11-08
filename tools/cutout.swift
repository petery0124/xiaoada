// 抠图：Vision 主体遮罩 + 白底精修（外轮廓白边、头发/脖子之间的白色缝隙、半透明边缘去白）
// 用法：cutout <输入图> <输出.png>    环境变量 STATS=1 打印封闭白块的统计，便于调阈值
//
// 步骤：
// 1. Vision 生成主体遮罩（软边），向内收 1.5px 并轻微模糊 → alphaV
// 2. 找"白底"像素：接近纯白且无色偏；按 4 连通分成块
//    · 碰到画面边缘的块 = 外部白底
//    · 封闭的块：内部非常平（几乎全是 254/255）且周围大多不是白色布料 → 是被头发/身体围住的白底缝隙
// 3. 白底块本身 alpha=0；紧挨着白底的 1px 像素按"有多白"给半透明 → alphaBg
// 4. alpha = min(alphaV, alphaBg)，再按预乘公式减掉混进去的白：P = 观测 - 255×(1-a)
import Foundation
import Vision
import CoreImage
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: cutout <in> <out.png>"); exit(1) }
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
let STATS = ProcessInfo.processInfo.environment["STATS"] != nil
guard let img = CIImage(contentsOf: inURL) else { print("cannot read \(args[1])"); exit(1) }
let w = Int(img.extent.width), h = Int(img.extent.height), n = w * h

// 如果图本身已经是透明底（比如 AI 直接给的透明 PNG），不要再抠，原样写出即可
do {
  let probeCtx = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
  var probe = [UInt8](repeating: 0, count: n * 4)
  probeCtx.render(img, toBitmap: &probe, rowBytes: w * 4, bounds: img.extent, format: .RGBA8, colorSpace: nil)
  var transparent = 0
  var i = 3; while i < n * 4 { if probe[i] < 128 { transparent += 1 }; i += 4 }
  if Double(transparent) / Double(n) > 0.05 {
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let cg = probeCtx.createCGImage(img, from: img.extent, format: .RGBA8, colorSpace: cs),
          let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { print("copy failed"); exit(7) }
    CGImageDestinationAddImage(dest, cg, nil); CGImageDestinationFinalize(dest)
    print("ok \(w)x\(h) already-transparent (\(Int(Double(transparent) / Double(n) * 100))% clear), copied as-is"); exit(0)
  }
}

// ---- 1. Vision 遮罩 ----
let handler = VNImageRequestHandler(ciImage: img, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([req]) } catch { print("vision failed: \(error)"); exit(2) }
guard let res = req.results?.first else { print("no subject found"); exit(3) }
let maskPB = try res.generateScaledMaskForImage(forInstances: res.allInstances, from: handler)
var mask = CIImage(cvPixelBuffer: maskPB)
if mask.extent.width != img.extent.width {
  mask = mask.transformed(by: CGAffineTransform(scaleX: img.extent.width / mask.extent.width, y: img.extent.height / mask.extent.height))
}
let rawMask = mask
let erodeF = CIFilter(name: "CIMorphologyMinimum")!
erodeF.setValue(mask, forKey: kCIInputImageKey); erodeF.setValue(1.5, forKey: kCIInputRadiusKey)
mask = erodeF.outputImage!.cropped(to: img.extent)
let blurF = CIFilter(name: "CIGaussianBlur")!
blurF.setValue(mask.clampedToExtent(), forKey: kCIInputImageKey); blurF.setValue(0.8, forKey: kCIInputRadiusKey)
mask = blurF.outputImage!.cropped(to: img.extent)

let ctx = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
var rgba = [UInt8](repeating: 0, count: n * 4)
ctx.render(img, toBitmap: &rgba, rowBytes: w * 4, bounds: img.extent, format: .RGBA8, colorSpace: nil)
var mv = [UInt8](repeating: 0, count: n)
ctx.render(mask, toBitmap: &mv, rowBytes: w, bounds: img.extent, format: .R8, colorSpace: nil)
var mraw = [UInt8](repeating: 0, count: n)
ctx.render(rawMask, toBitmap: &mraw, rowBytes: w, bounds: img.extent, format: .R8, colorSpace: nil)

@inline(__always) func mn3(_ i: Int) -> Int { Int(min(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])) }
@inline(__always) func mx3(_ i: Int) -> Int { Int(max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])) }

// ---- 2. 白底像素与连通块 ----
var isWhite = [Bool](repeating: false, count: n)
for i in 0..<n { let a = mn3(i), b = mx3(i); isWhite[i] = a >= 238 && (b - a) <= 10 }
var label = [Int32](repeating: -1, count: n)
struct Comp { var area = 0, border = false, flat = 0, interior = 0, nbTotal = 0, nbNonFabric = 0, maskSum = 0, minDist = Int.max; var minX = Int.max, minY = Int.max, maxX = 0, maxY = 0 }
var comps: [Comp] = []
var queue = [Int](); queue.reserveCapacity(1 << 16)
let dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
for s in 0..<n where isWhite[s] && label[s] < 0 {
  let id = Int32(comps.count); var c = Comp()
  queue.removeAll(keepingCapacity: true); queue.append(s); label[s] = id
  var qi = 0
  while qi < queue.count {
    let p = queue[qi]; qi += 1; c.area += 1; c.maskSum += Int(mraw[p])
    let x = p % w, y = p / w
    c.minX = min(c.minX, x); c.maxX = max(c.maxX, x); c.minY = min(c.minY, y); c.maxY = max(c.maxY, y)
    if x == 0 || y == 0 || x == w - 1 || y == h - 1 { c.border = true }
    var allWhiteNb = true
    for (dx, dy) in dirs {
      let nx = x + dx, ny = y + dy
      if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
      let q = ny * w + nx
      if isWhite[q] { if label[q] < 0 { label[q] = id; queue.append(q) } }
      else { allWhiteNb = false; c.nbTotal += 1; if mn3(q) < 205 { c.nbNonFabric += 1 } }
    }
    if allWhiteNb { c.interior += 1; if mn3(p) >= 254 { c.flat += 1 } }
  }
  comps.append(c)
}
// 每个像素到"外部白底"的距离（BFS，最多 160px）
var dist = [Int16](repeating: -1, count: n)
var bfs = [Int](); bfs.reserveCapacity(n / 4)
for i in 0..<n where label[i] >= 0 && comps[Int(label[i])].border { dist[i] = 0; bfs.append(i) }
var bi = 0
while bi < bfs.count {
  let p = bfs[bi]; bi += 1; let d = dist[p]; if d >= 160 { continue }
  let x = p % w, y = p / w
  for (dx, dy) in dirs {
    let nx = x + dx, ny = y + dy
    if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
    let q = ny * w + nx
    if dist[q] < 0 { dist[q] = d + 1; bfs.append(q) }
  }
}
for i in 0..<n where label[i] >= 0 && dist[i] >= 0 {
  let ci = Int(label[i]); if Int(dist[i]) < comps[ci].minDist { comps[ci].minDist = Int(dist[i]) }
}
// 判定哪些块是白底
var isBg = [Bool](repeating: false, count: comps.count)
for (i, c) in comps.enumerated() {
  if c.border { isBg[i] = true; continue }
  if c.area < 6 { continue }
  let flatFrac = c.interior > 0 ? Double(c.flat) / Double(c.interior) : 0
  let nonFabric = c.nbTotal > 0 ? Double(c.nbNonFabric) / Double(c.nbTotal) : 0
  // 实测规律：白色布料的高光块 flat≈0 且离外部白底远；被头发/身体围住的白底缝隙离外部白底很近（<40px）、
  // 内部较平、周围多是头发皮肤等非白色；Vision 对缝隙常常也不确定（mask 均值偏低）
  let maskMean = Double(c.maskSum) / Double(c.area)
  let near = c.minDist <= 40, veryNear = c.minDist <= 6
  let hole =
    (c.interior >= 200 && flatFrac >= 0.9) ||                                  // 大块纯平白底（如两腿之间）
    (near && c.interior >= 4 && flatFrac >= 0.15 && nonFabric >= 0.25) ||      // 头发与脖子/肩膀之间的缝隙
    (veryNear && nonFabric >= 0.4 && c.area <= 400) ||                         // 贴着轮廓的小缝隙，带淡阴影也算
    (near && c.interior <= 2 && c.area <= 80 && nonFabric >= 0.5) ||           // 细长的白色缝
    (maskMean <= 230 && nonFabric >= 0.25)                                     // Vision 自己也拿不准的白块
  isBg[i] = hole
  if STATS && c.area >= 8 {
    let mm = Double(c.maskSum) / Double(c.area)
    FileHandle.standardError.write("comp area=\(c.area) interior=\(c.interior) flat=\(String(format: "%.2f", flatFrac)) nonFabric=\(String(format: "%.2f", nonFabric)) mask=\(String(format: "%.0f", mm)) dist=\(c.minDist == Int.max ? ">160" : String(c.minDist)) box=(\(c.minX),\(c.minY))-(\(c.maxX),\(c.maxY)) -> \(hole ? "HOLE" : "keep")\n".data(using: .utf8)!)
  }
}

// ---- 3. 白底 alpha ----
var alphaBg = [UInt8](repeating: 255, count: n)
for i in 0..<n where label[i] >= 0 && isBg[Int(label[i])] { alphaBg[i] = 0 }
// 紧挨白底 2px 以内的"浅灰且无色偏"像素（抗锯齿过渡、缝隙里的淡阴影）按亮度给半透明；
// 皮肤有色偏、头发够深，都不受影响
var alphaEdge = alphaBg
for y in 0..<h {
  for x in 0..<w {
    let i = y * w + x
    if alphaBg[i] == 0 { continue }
    let a = mn3(i), b = mx3(i)
    if a < 150 || (b - a) > 14 { continue }
    var nearBg = false
    outer: for dy in -2...2 { for dx in -2...2 {
      let nx = x + dx, ny = y + dy
      if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
      if alphaBg[ny * w + nx] == 0 { nearBg = true; break outer }
    } }
    if nearBg {
      let v = Double(255 - a) / 105.0 // 150 以下算完全不透明
      alphaEdge[i] = UInt8(max(0, min(255, Int((min(1, v) * 255).rounded()))))
    }
  }
}

// ---- 4. 合成 ----
@inline(__always) func smooth(_ v: Double, _ e0: Double, _ e1: Double) -> Double {
  let t = max(0, min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
}
var out = [UInt8](repeating: 0, count: n * 4)
var edgePixels = 0, holePixels = 0
for i in 0..<n {
  let av = Int((smooth(Double(mv[i]) / 255.0, 0.35, 0.85) * 255).rounded())
  let a = min(av, Int(alphaEdge[i]))
  if a == 0 { if av > 0 { holePixels += 1 }; continue }
  if a < 255 { edgePixels += 1 }
  let white = 255 - a
  for c in 0..<3 { out[i * 4 + c] = UInt8(max(0, min(a, Int(rgba[i * 4 + c]) - white))) }
  out[i * 4 + 3] = UInt8(a)
}

let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let info = CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
guard let cg = out.withUnsafeMutableBytes({ buf -> CGImage? in
  guard let c = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs, bitmapInfo: info) else { return nil }
  return c.makeImage()
}) else { print("cg failed"); exit(4) }
guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { print("dest failed"); exit(5) }
CGImageDestinationAddImage(dest, cg, nil)
guard CGImageDestinationFinalize(dest) else { print("write failed"); exit(6) }
print("ok \(w)x\(h) edge=\(edgePixels) holes=\(holePixels)")

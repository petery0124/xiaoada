#!/bin/zsh
# 把 收图/立绘 和 收图/贴纸 里的图（png/jpg/webp 都行）抠掉白底，输出到 assets/looks 和 assets/stickers
# 用法：zsh tools/prepare.sh
set -e
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
process() { # $1 源目录 $2 目标目录 $3 最大边长
  for f in "$1"/*(.N); do
    name="${f:t:r}"; ext="${f:e:l}"
    case "$ext" in png|jpg|jpeg|webp|heic) ;; *) continue ;; esac
    sips -s format png -Z "$3" "$f" --out "$TMP/$name.png" >/dev/null 2>&1 || { echo "跳过 $f（读不了）"; continue; }
    if ./tools/cutout "$TMP/$name.png" "$2/$name.png" >/dev/null; then echo "✓ $2/$name.png"; else echo "✗ $name 抠图失败"; fi
  done
}
process 收图/立绘 assets/looks 1536
# 立绘缩到 840x1260，手机上够用，体积小一半
for f in assets/looks/*.png(.N); do sips -Z 1260 "$f" >/dev/null 2>&1; done
process 收图/贴纸 assets/stickers 600
# 衣柜卡片用的小图
mkdir -p assets/looks-thumb
for f in assets/looks/*.png(.N); do sips -Z 360 "$f" --out "assets/looks-thumb/${f:t}" >/dev/null 2>&1; done
# 边缘补色 + WebP（透明通道无损、颜色 q85），页面优先加载 WebP
for f in assets/looks/*.png(.N) assets/looks-thumb/*.png(.N); do ./tools/bleed "$f" "$f" >/dev/null; done
for f in assets/looks/*.png(.N); do cwebp -quiet -q 85 -alpha_q 100 -exact -sharp_yuv -m 6 "$f" -o "${f%.png}.webp"; done
for f in assets/looks-thumb/*.png(.N); do cwebp -quiet -q 82 -alpha_q 100 -exact -sharp_yuv -m 6 "$f" -o "${f%.png}.webp"; done
for f in assets/stickers/*.png(.N); do ./tools/bleed "$f" "$f" >/dev/null; cwebp -quiet -q 85 -alpha_q 100 -exact -sharp_yuv -m 6 "$f" -o "${f%.png}.webp"; done
rm -rf "$TMP"
echo "完成：$(ls assets/looks | wc -l | tr -d ' ') 张立绘，$(ls assets/stickers | wc -l | tr -d ' ') 张贴纸"

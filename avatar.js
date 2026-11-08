/* 小阿答 Q 版形象绘制库
 * 所有图层都是 SVG 片段，坐标系 viewBox 0 0 500 760
 * 图层顺序：背景 → 后发 → 身体 → 衣服 → 配饰 → 中发(马尾/前侧发) → 头 → 五官 → 刘海 → 头饰
 */
window.AV = (function () {
  const W = 500, H = 760;
  const SKIN = '#fde6da', SKIN_SH = '#f3c7b4', SKIN_DK = '#e7ad99';

  const M = f => `<g transform="translate(${W} 0) scale(-1 1)">${f}</g>`; // 左右镜像
  const P = (d, fill, x = '') => `<path d="${d}" fill="${fill}" ${x}/>`;
  const E = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${x}/>`;
  const C = (cx, cy, r, fill, x = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${x}/>`;
  const S = (d, stroke, w, x = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
  const G = (inner, x = '') => `<g ${x}>${inner}</g>`;
  const R = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;

  /* ---------- 公共 defs：渐变、花纹、剪裁 ---------- */
  const DEFS = `
    <radialGradient id="irisG" cx="50%" cy="40%" r="62%">
      <stop offset="0" stop-color="#a5745a"/><stop offset=".5" stop-color="#5e3a2b"/><stop offset="1" stop-color="#2a1711"/>
    </radialGradient>
    <linearGradient id="tulle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>
    <linearGradient id="satin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9c8ee"/><stop offset=".5" stop-color="#c3ace0"/><stop offset="1" stop-color="#d6c4ec"/></linearGradient>
    <clipPath id="eyeClip"><ellipse cx="206" cy="264" rx="23" ry="26"/></clipPath>
    <radialGradient id="blushG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f58fa0" stop-opacity=".6"/><stop offset="1" stop-color="#f58fa0" stop-opacity="0"/></radialGradient>
    <radialGradient id="hairShineG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <pattern id="gingham" width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="18" height="18" fill="#fff6f4"/><rect width="9" height="18" fill="#ef5b56" opacity=".55"/><rect width="18" height="9" fill="#ef5b56" opacity=".55"/>
    </pattern>
    <pattern id="plaid" width="28" height="28" patternUnits="userSpaceOnUse">
      <rect width="28" height="28" fill="#a3bfe3"/><rect width="28" height="6" y="4" fill="#fff" opacity=".6"/><rect width="6" height="28" x="4" fill="#fff" opacity=".6"/>
      <rect width="28" height="3" y="18" fill="#1d3b78" opacity=".65"/><rect width="3" height="28" x="18" fill="#1d3b78" opacity=".65"/>
    </pattern>
    <pattern id="lace" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#eadbc4"/><circle cx="5" cy="5" r="2.3" fill="#fbf3e6"/><circle cx="0" cy="0" r="1.3" fill="#fbf3e6"/><circle cx="10" cy="0" r="1.3" fill="#fbf3e6"/><circle cx="0" cy="10" r="1.3" fill="#fbf3e6"/><circle cx="10" cy="10" r="1.3" fill="#fbf3e6"/>
    </pattern>
    <pattern id="knit" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
      <rect width="14" height="14" fill="#7b8290"/><rect width="5" height="14" fill="#687080"/>
    </pattern>
    <pattern id="hearts" width="22" height="22" patternUnits="userSpaceOnUse">
      <rect width="22" height="22" fill="#c6e6f5"/>
      <path d="M11 8 C 9 4, 4 5, 5 9 C 6 12, 11 15, 11 15 C 11 15, 16 12, 17 9 C 18 5, 13 4, 11 8 Z" fill="#f7b6c9" opacity=".9"/>
    </pattern>
    <pattern id="bunnyprint" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="#c6e6f5"/>
      <circle cx="9" cy="10" r="3" fill="#fff" opacity=".8"/><circle cx="23" cy="22" r="2" fill="#f7b6c9" opacity=".9"/>
    </pattern>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
  `;

  /* ---------- 身体基础形 ---------- */
  const ARM_L = 'M 204 382 C 188 392, 178 428, 179 460 C 180 490, 174 508, 171 522 L 195 526 C 198 504, 203 484, 204 452 C 205 420, 209 398, 219 386 Z';
  const LEG_L = 'M 214 508 C 211 548, 212 606, 216 646 L 218 680 L 245 680 L 247 646 C 250 606, 250 548, 248 508 Z';
  const FACE = 'M 148 236 C 146 302, 188 368, 250 368 C 312 368, 354 302, 352 236 C 352 160, 312 106, 250 106 C 188 106, 148 160, 148 236 Z';
  const TORSO = 'M 196 384 C 214 376, 286 376, 304 384 C 307 424, 302 466, 297 506 L 296 516 L 204 516 L 203 506 C 198 466, 193 424, 196 384 Z';

  function handL() {
    return P('M 170 524 C 165 538, 171 551, 184 551 C 197 551, 201 540, 197 526 Z', SKIN) +
      E(197, 530, 4.5, 7.5, SKIN, 'transform="rotate(-22 197 530)"') +
      S('M 178 541 C 182 547, 188 547, 192 541', SKIN_DK, 1.2, 'opacity=".45"');
  }
  function bodyBack() {
    const armL = P(ARM_L, SKIN) + handL();
    const legL = P(LEG_L, SKIN) +
      P('M 241 520 C 247 560, 248 620, 245 680 L 247 680 C 250 606, 250 548, 248 508 Z', SKIN_SH, 'opacity=".4"');
    return G(
      P('M 233 338 L 267 338 L 269 388 L 231 388 Z', SKIN) +
      P('M 233 338 L 267 338 L 266 360 C 258 366, 242 366, 234 360 Z', SKIN_SH) +
      P(TORSO, SKIN) +
      legL + M(legL) + armL + M(armL)
    );
  }
  function head() {
    const ear = E(150, 262, 9, 13, SKIN) + E(151, 263, 5, 8, SKIN_SH, 'opacity=".7"');
    return G(
      ear + M(ear) +
      P(FACE, SKIN) +
      // 脸颊两侧淡淡的暖色
      E(166, 300, 14, 26, SKIN_SH, 'opacity=".25"') + M(E(166, 300, 14, 26, SKIN_SH, 'opacity=".25"')) +
      // 刘海下的阴影
      E(250, 212, 94, 16, SKIN_SH, 'opacity=".55"')
    );
  }

  /* ---------- 五官 ---------- */
  function eyeL() {
    return `<g class="eye">
      ${E(206, 264, 23, 26, '#fff')}
      <g clip-path="url(#eyeClip)">
        ${C(207, 269, 21, 'url(#irisG)')}
        ${E(207, 270, 9, 11.5, '#1a0f0a')}
        ${E(207, 283, 11, 4.5, '#e8b595', 'opacity=".6"')}
        ${P('M 184 250 C 194 240, 220 240, 230 250 L 230 236 L 184 236 Z', '#2a1812', 'opacity=".22"')}
        ${C(197, 256, 8, '#fff')}
        ${C(217, 280, 4, '#fff', 'opacity=".95"')}
        ${C(213, 259, 2, '#fff', 'opacity=".9"')}
      </g>
      ${P('M 182 262 C 186 232, 226 226, 233 258 C 234 262, 231 264, 229 262 C 222 244, 191 246, 185 264 C 183 265, 182 264, 182 262 Z', '#2a1812')}
      ${P('M 231 250 C 236 244, 242 241, 246 243 C 243 247, 238 252, 234 256 Z', '#2a1812')}
      ${P('M 228 272 C 233 272, 237 274, 239 277 C 236 277, 232 276, 229 275 Z', '#2a1812', 'opacity=".8"')}
      ${S('M 188 286 C 196 294, 218 294, 226 286', '#8a5a4a', 1.8, 'opacity=".45"')}
      ${P('M 187 288 C 196 298, 218 298, 227 288 C 218 302, 196 302, 187 288 Z', '#fff', 'opacity=".3"')}
      ${S('M 190 236 C 200 228, 216 228, 226 236', '#e3a893', 1.8, 'opacity=".5"')}
    </g>`;
  }
  function face(browColor) {
    const browL = S('M 186 226 C 198 215, 216 215, 230 221', browColor, 2.6, 'opacity=".8"');
    const blushL = E(186, 297, 24, 13, 'url(#blushG)');
    return G(
      eyeL() + M(eyeL()) +
      browL + M(browL) +
      S('M 250 292 C 254 296, 254 301, 249 303', '#e0a48f', 2.4) +
      S('M 241 316 C 246 325, 254 325, 259 316', '#d2626c', 3) +
      P('M 244 318.5 C 247 323, 253 323, 256 318.5 Z', '#f08a94', 'opacity=".9"') +
      blushL + M(blushL)
    );
  }

  /* ---------- 头发 ---------- */
  // 空气刘海的下边缘：从右往左一缕缕
  function airBangsEdge() {
    const gaps = [346, 322, 296, 270, 244, 218, 192, 164];
    const tips = [[335, 220], [309, 234], [283, 224], [257, 236], [231, 223], [205, 234], [178, 221]];
    let d = '';
    for (let i = 0; i < tips.length; i++) {
      const [tx, ty] = tips[i];
      const gx = gaps[i + 1];
      d += ` C ${gaps[i] - 2} ${ty - 14}, ${tx + 4} ${ty - 3}, ${tx} ${ty}`;
      d += ` C ${tx - 4} ${ty - 3}, ${gx + 2} ${ty - 14}, ${gx} 200`;
    }
    return d;
  }
  function capPath(edge) {
    // 头顶 + 刘海一体
    return `M 140 240 C 130 150, 182 78, 250 78 C 318 78, 370 150, 360 240 C 356 230, 350 214, 346 200 ${edge} C 158 212, 148 226, 140 240 Z`;
  }
  function curtainCap() {
    const cap = 'M 140 240 C 130 150, 182 78, 250 78 C 318 78, 370 150, 360 240 C 338 176, 298 150, 250 150 C 202 150, 162 176, 140 240 Z';
    const strand = 'M 250 86 C 212 94, 184 136, 168 190 C 160 214, 156 236, 162 258 C 180 240, 198 202, 216 176 C 230 154, 244 118, 250 86 Z';
    return { cap, strand };
  }
  function shine(pal) {
    return E(250, 126, 86, 38, 'url(#hairShineG)') +
      S('M 238 94 C 234 140, 232 180, 236 216', pal.shine, 2.2, 'opacity=".3"') +
      S('M 268 96 C 272 140, 272 176, 268 212', pal.shine, 2, 'opacity=".25"') +
      S('M 204 108 C 198 150, 198 184, 204 210', pal.shine, 2, 'opacity=".22"') +
      S('M 296 110 C 304 150, 304 186, 298 210', pal.shine, 2, 'opacity=".22"') +
      S('M 222 100 C 218 150, 216 190, 220 222 M 252 92 C 250 150, 250 196, 254 228 M 284 102 C 288 150, 288 190, 284 218', pal.dark, 1.6, 'opacity=".3"');
  }
  const SIDE_LOCK_L = 'M 147 236 C 139 272, 143 306, 160 342 C 168 332, 164 294, 160 252 Z';
  const FRONT_LOCK_L = 'M 150 232 C 126 300, 124 412, 148 508 C 160 516, 174 508, 178 496 C 168 420, 165 330, 165 252 Z';

  const HAIR_PAL = {
    brown:  { base: '#3f2b24', dark: '#2b1b16', shine: '#8c6a5e' },
    lightbrown: { base: '#7a5440', dark: '#5a3a2b', shine: '#b48b73' },
    blonde: { base: '#e6c98f', dark: '#c9a86a', shine: '#fff1c9' },
    orange: { base: '#d6853f', dark: '#b2652a', shine: '#f3b77f' },
  };

  function hairLongStraight(pal) {
    return {
      back: P('M 150 212 C 124 330, 128 470, 142 606 C 158 614, 176 604, 184 588 C 202 612, 228 616, 250 608 C 272 616, 298 612, 316 588 C 324 604, 342 614, 358 606 C 372 470, 376 330, 350 212 C 342 128, 304 78, 250 78 C 196 78, 158 128, 150 212 Z', pal.dark),
      mid: P(FRONT_LOCK_L, pal.base) + M(P(FRONT_LOCK_L, pal.base)),
      front: P(capPath(airBangsEdge()), pal.base) + P(SIDE_LOCK_L, pal.base) + M(P(SIDE_LOCK_L, pal.base)) + shine(pal),
    };
  }
  function hairTwinTails(pal, tie = '#e8485a') {
    const tailL = P('M 156 262 C 126 290, 114 350, 128 410 C 138 452, 126 500, 138 542 C 144 552, 154 550, 157 538 C 172 482, 160 424, 172 380 C 182 340, 172 300, 166 270 Z', pal.base) +
      S('M 142 300 C 132 350, 140 420, 146 482', pal.shine, 4, 'opacity=".28"') +
      S('M 162 300 C 160 360, 156 440, 150 520', pal.dark, 2, 'opacity=".35"') +
      C(158, 266, 8.5, tie) + C(155, 263, 3, '#fff', 'opacity=".6"');
    return {
      back: P('M 150 212 C 140 262, 140 292, 152 322 L 348 322 C 360 292, 360 262, 350 212 C 342 128, 304 78, 250 78 C 196 78, 158 128, 150 212 Z', pal.dark),
      mid: tailL + M(tailL),
      front: P(capPath(airBangsEdge()), pal.base) + P(SIDE_LOCK_L, pal.base) + M(P(SIDE_LOCK_L, pal.base)) + shine(pal),
    };
  }
  function hairLongWavy(pal, bangs = 'air') {
    const back = P('M 150 212 Q 116 290, 138 340 Q 112 400, 136 452 Q 110 512, 142 558 Q 126 602, 166 598 Q 184 628, 206 596 Q 230 632, 250 600 Q 270 632, 294 596 Q 316 628, 334 598 Q 374 602, 358 558 Q 390 512, 364 452 Q 388 400, 362 340 Q 384 290, 350 212 C 342 128, 304 78, 250 78 C 196 78, 158 128, 150 212 Z', pal.dark);
    const lockL = 'M 150 232 Q 118 320, 136 400 Q 118 470, 150 510 C 162 518, 176 510, 180 498 Q 160 440, 170 380 Q 158 320, 165 252 Z';
    let front;
    if (bangs === 'curtain') {
      const { cap, strand } = curtainCap();
      front = P(cap, pal.base) + P(strand, pal.base) + M(P(strand, pal.base)) + shine(pal);
    } else {
      front = P(capPath(airBangsEdge()), pal.base) + P(SIDE_LOCK_L, pal.base) + M(P(SIDE_LOCK_L, pal.base)) + shine(pal);
    }
    return { back, mid: P(lockL, pal.base) + M(P(lockL, pal.base)), front };
  }

  /* ---------- 衣服零件 ---------- */
  const NECK = {
    round: 'C 212 380, 226 380, 232 392 C 240 406, 260 406, 268 392 C 274 380, 288 380, 302 384',
    square: 'C 212 380, 224 380, 228 386 L 228 404 L 272 404 L 272 386 C 276 380, 288 380, 302 384',
    v: 'C 214 380, 232 380, 250 412 C 268 380, 286 380, 302 384',
    boat: 'C 222 379, 278 379, 302 384',
    high: 'C 214 376, 286 376, 302 384',
  };
  function bodice(fill, neck = 'round', x = '') {
    return P(`M 198 384 ${NECK[neck]} C 305 424, 301 450, 299 470 L 201 470 C 199 450, 195 424, 198 384 Z`, fill, x);
  }
  function strapless(fill, y = 412, x = '') {
    return P(`M 206 ${y} C 222 ${y - 6}, 278 ${y - 6}, 294 ${y} C 299 430, 300 450, 299 470 L 201 470 C 200 450, 201 430, 206 ${y} Z`, fill, x);
  }
  function skirt(fill, yTop = 466, yHem = 600, flare = 36, x = '') {
    const l = 250 - 50, r = 250 + 50;
    return P(`M ${l} ${yTop} C ${l - 4} ${yTop + 40}, ${l - flare + 4} ${yHem - 30}, ${l - flare - 4} ${yHem} C ${250 - 24} ${yHem + 12}, ${250 + 24} ${yHem + 12}, ${r + flare + 4} ${yHem} C ${r + flare - 4} ${yHem - 30}, ${r + 4} ${yTop + 40}, ${r} ${yTop} Z`, fill, x);
  }
  // 沿裙摆的花边扇贝
  function scallops(x0, x1, yHem, r, fill, bulge = 10) {
    let s = '';
    const n = Math.round((x1 - x0) / (r * 1.7));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n;
      const t = (x - 250) / ((x1 - x0) / 2);
      const y = yHem + bulge * (1 - t * t);
      s += C(x, y, r, fill);
    }
    return s;
  }
  function puffSleeveL(fill, x = '') {
    return E(200, 398, 27, 23, fill, x) + P('M 174 408 C 186 426, 216 426, 226 406 C 216 420, 188 420, 174 408 Z', '#000', 'opacity=".12"');
  }
  function longSleeveL(fill) {
    return P(ARM_L, fill, `stroke="${fill}" stroke-width="7"`);
  }
  function shortSleeveL(fill) {
    return P('M 199 381 C 189 392, 183 412, 184 432 L 212 438 C 207 420, 209 398, 219 386 Z', fill);
  }
  function collarRound(fill = '#fff') {
    return P('M 231 386 C 235 402, 247 406, 250 398 C 253 406, 265 402, 269 386 C 262 380, 238 380, 231 386 Z', fill);
  }
  function bow(cx, cy, s, fill, dark) {
    return G(
      E(cx - s * .95, cy, s, s * .62, fill, `transform="rotate(-18 ${cx - s * .95} ${cy})"`) +
      E(cx + s * .95, cy, s, s * .62, fill, `transform="rotate(18 ${cx + s * .95} ${cy})"`) +
      P(`M ${cx - s * .35} ${cy + s * .3} L ${cx - s * .7} ${cy + s * 1.5} L ${cx - s * .15} ${cy + s * 1.1} Z`, fill) +
      P(`M ${cx + s * .35} ${cy + s * .3} L ${cx + s * .7} ${cy + s * 1.5} L ${cx + s * .15} ${cy + s * 1.1} Z`, fill) +
      C(cx, cy, s * .38, dark || fill) +
      C(cx - s * .5, cy - s * .15, s * .16, '#fff', 'opacity=".6"')
    );
  }
  function socksKnee(fill = '#fff', top = 586) {
    const l = P(`M 213 ${top} L 249 ${top} L 247 646 L 245 680 L 218 680 L 216 646 Z`, fill) +
      S(`M 214 ${top + 8} L 248 ${top + 8}`, '#000', 1.5, 'opacity=".08"');
    return l + M(l);
  }
  function socksShort(fill = '#fff') { return socksKnee(fill, 650); }
  function shoesMary(fill, strap = true) {
    const l = P('M 210 670 C 207 690, 212 703, 232 703 C 253 703, 257 690, 253 670 C 240 676, 222 676, 210 670 Z', fill) +
      (strap ? S('M 212 681 L 252 681', fill, 4) + C(246, 681, 2.4, '#fff', 'opacity=".8"') : '') +
      E(226, 694, 8, 3, '#fff', 'opacity=".18"');
    return l + M(l);
  }
  function shoesSneaker(fill = '#fff', sole = '#e9e9e9') {
    const l = P('M 208 668 C 204 690, 210 704, 232 704 C 254 704, 258 690, 254 668 C 240 676, 222 676, 208 668 Z', fill) +
      P('M 206 692 C 208 702, 216 705, 232 705 C 248 705, 256 702, 257 692 C 240 698, 222 698, 206 692 Z', sole) +
      S('M 218 676 L 246 676 M 220 684 L 244 684', '#ccc', 1.4);
    return l + M(l);
  }
  function loafers(fill = '#6b4126') {
    const l = P('M 210 670 C 207 690, 212 703, 232 703 C 253 703, 257 690, 253 670 C 240 676, 222 676, 210 670 Z', fill) +
      P('M 218 676 C 226 672, 238 672, 246 676 L 244 684 C 236 680, 228 680, 220 684 Z', '#8a5a3a');
    return l + M(l);
  }
  function boots(fill = '#2b2b2f') {
    const l = P('M 214 612 L 248 612 L 253 672 C 257 690, 253 703, 232 703 C 212 703, 207 690, 210 672 Z', fill) +
      S('M 216 622 L 246 622', '#000', 1.5, 'opacity=".25"');
    return l + M(l);
  }

  /* ---------- 衣服 ---------- */
  const OUTFITS = {
    // 1 草莓格子裙
    strawberry() {
      return G(
        socksShort('#fff') + shoesMary('#6a3d28') +
        skirt('url(#gingham)', 464, 598, 38) +
        skirt('#000', 464, 598, 38, 'opacity=".06"') +
        scallops(158, 342, 606, 5.5, '#fff') +
        bodice('url(#gingham)', 'square') +
        // 抽褶线
        S('M 206 414 C 230 418, 270 418, 294 414 M 205 426 C 230 430, 270 430, 295 426 M 204 438 C 230 442, 270 442, 296 438', '#fff', 1.6, 'opacity=".8"') +
        // 领口白花边
        P('M 226 386 L 228 404 L 272 404 L 274 386 C 262 390, 238 390, 226 386 Z', '#fff') +
        scallops(228, 272, 404, 3.2, '#fff', 0) +
        puffSleeveL('url(#gingham)') + M(puffSleeveL('url(#gingham)')) +
        scallops(180, 222, 416, 3, '#fff', 2) + M(scallops(180, 222, 416, 3, '#fff', 2)) +
        // 腰间小草莓
        C(250, 470, 7, '#e63946') + P('M 244 464 L 250 458 L 256 464 Z', '#4caf50') +
        C(247, 471, 1.2, '#fff6') + C(253, 473, 1.2, '#fff6')
      );
    },
    // 2 黑白洛丽塔
    lolita() {
      const tier = (yTop, yHem, flare) => skirt('#1d1b1f', yTop, yHem, flare) + scallops(250 - 54 - flare - 2, 250 + 54 + flare + 2, yHem + 6, 5, '#fff', 10);
      return G(
        socksKnee('#fff') + shoesMary('#1d1b1f') +
        bow(222, 590, 5, '#1d1b1f') + bow(278, 590, 5, '#1d1b1f') +
        tier(466, 540, 20) + tier(530, 584, 32) + tier(574, 614, 44) +
        longSleeveL('#fff') + M(longSleeveL('#fff')) +
        bodice('#1d1b1f', 'square') +
        // 白衬衫领口与系带
        P('M 214 384 L 228 384 L 228 404 L 272 404 L 272 384 L 286 384 C 276 376, 224 376, 214 384 Z', '#fff') +
        collarRound('#fff') +
        S('M 234 416 L 266 430 M 266 416 L 234 430 M 234 430 L 266 444 M 266 430 L 234 444 M 234 444 L 266 458 M 266 444 L 234 458', '#fff', 2) +
        C(234, 416, 2.2, '#fff') + C(266, 416, 2.2, '#fff') + C(234, 430, 2.2, '#fff') + C(266, 430, 2.2, '#fff') + C(234, 444, 2.2, '#fff') + C(266, 444, 2.2, '#fff') +
        bow(250, 408, 9, '#fff', '#eee') +
        bow(205, 476, 6, '#fff') + bow(295, 476, 6, '#fff') +
        // 袖口
        S('M 176 518 L 194 522', '#ddd', 3) + M(S('M 176 518 L 194 522', '#ddd', 3))
      );
    },
    // 3 蓝色兔兔裙
    bunny() {
      return G(
        socksKnee('#fff') + shoesMary('#fff') +
        skirt('url(#bunnyprint)', 466, 596, 36) +
        scallops(158, 342, 604, 5, '#f7b6c9') +
        // 口袋
        R(196, 540, 32, 30, '#dff1fa', 6) + R(272, 540, 32, 30, '#dff1fa', 6) +
        bow(212, 540, 6, '#f7b6c9', '#f29bb5') + bow(288, 540, 6, '#f7b6c9', '#f29bb5') +
        bodice('#c6e6f5', 'round') +
        scallops(232, 268, 396, 3, '#f7b6c9', 6) +
        // 胸前小兔子
        C(250, 436, 11, '#fff') + E(244, 422, 3.5, 9, '#fff') + E(256, 422, 3.5, 9, '#fff') +
        E(244, 423, 1.6, 6, '#f7b6c9') + E(256, 423, 1.6, 6, '#f7b6c9') +
        C(246, 435, 1.3, '#555') + C(254, 435, 1.3, '#555') + P('M 248 440 Q 250 442 252 440', '#f29bb5') +
        puffSleeveL('#c6e6f5') + M(puffSleeveL('#c6e6f5')) +
        scallops(180, 222, 416, 3, '#f7b6c9', 2) + M(scallops(180, 222, 416, 3, '#f7b6c9', 2))
      );
    },
    // 4 JK 制服
    jk() {
      const pleats = () => {
        let s = '';
        for (let i = 0; i < 9; i++) {
          const x = 206 + i * 11;
          s += P(`M ${x} 470 L ${x + 5} 470 L ${x + 5 + (x - 250) * .55} 602 L ${x + (x - 250) * .55} 602 Z`, '#1d3b78', 'opacity=".18"');
        }
        return s;
      };
      return G(
        socksKnee('#fff') + loafers('#6b4126') +
        skirt('url(#plaid)', 468, 598, 40) + pleats() +
        shortSleeveL('#fff') + M(shortSleeveL('#fff')) +
        bodice('#fff', 'high') +
        P('M 206 392 C 220 386, 280 386, 294 392 C 300 420, 300 448, 298 470 L 202 470 C 200 448, 200 420, 206 392 Z', '#2d5bb9') +
        P('M 226 390 C 236 404, 246 418, 250 430 C 254 418, 264 404, 274 390 Z', '#fff') +
        P('M 230 380 C 240 392, 246 400, 250 412 C 254 400, 260 392, 270 380 Z', '#fff') +
        bow(250, 408, 7, '#d8232a', '#a81a20') +
        C(250, 440, 2.4, '#1d3b78') + C(250, 456, 2.4, '#1d3b78')
      );
    },
    // 5 白纱裙 + 黑丝带
    whitebow() {
      return G(
        shoesMary('#fff') +
        skirt('#fff', 466, 600, 40) + skirt('url(#tulle)', 466, 612, 50) +
        scallops(156, 344, 608, 6, '#fff', 10) +
        P('M 204 380 C 220 372, 280 372, 296 380 C 300 392, 298 404, 294 410 L 206 410 C 202 404, 200 392, 204 380 Z', '#fff') +
        bodice('#fff', 'boat') +
        scallops(206, 294, 384, 4, '#fff', -4) +
        puffSleeveL('#fff') + M(puffSleeveL('#fff')) +
        S('M 232 344 L 268 344', '#1d1b1f', 4) + bow(250, 350, 5, '#1d1b1f') +
        bow(250, 404, 8, '#1d1b1f', '#333')
      );
    },
    // 6 米色蕾丝裙
    tiara() {
      return G(
        shoesMary('#e9d9c3', false) +
        skirt('url(#lace)', 466, 596, 34) +
        scallops(160, 340, 604, 5, '#f6ecdc') +
        bodice('url(#lace)', 'square') +
        scallops(228, 272, 404, 3.2, '#f6ecdc', 0) +
        puffSleeveL('url(#lace)') + M(puffSleeveL('url(#lace)')) +
        // 珍珠手链
        C(176, 522, 2.2, '#fff') + C(181, 525, 2.2, '#fff') + C(187, 526, 2.2, '#fff') + C(192, 524, 2.2, '#fff')
      );
    },
    // 7 熊猫卫衣
    panda() {
      return G(
        P('M 214 560 L 248 560 L 246 680 L 218 680 Z', '#1f1f24') + M(P('M 214 560 L 248 560 L 246 680 L 218 680 Z', '#1f1f24')) +
        shoesSneaker('#fff', '#ddd') +
        P('M 190 386 C 214 374, 286 374, 310 386 C 318 440, 318 520, 312 580 L 188 580 C 182 520, 182 440, 190 386 Z', '#5a4634') +
        longSleeveL('#5a4634') + M(longSleeveL('#5a4634')) +
        P('M 186 578 L 314 578 L 314 590 L 186 590 Z', '#4e3c2d') +
        // 帽子
        P('M 214 384 C 226 372, 274 372, 286 384 C 280 398, 220 398, 214 384 Z', '#4e3c2d') +
        P('M 226 440 L 274 440 L 272 470 L 228 470 Z', '#f2e9dc', 'opacity=".85"') +
        S('M 236 452 L 264 452 M 240 460 L 260 460', '#5a4634', 2) +
        S('M 240 400 L 240 426 M 260 400 L 260 426', '#eee', 3)
      );
    },
    // 8 黑色大 T 恤
    blondetee() {
      return G(
        P('M 216 560 L 248 560 L 246 620 L 218 620 Z', '#1f1f24') + M(P('M 216 560 L 248 560 L 246 620 L 218 620 Z', '#1f1f24')) +
        shoesSneaker('#fff', '#ddd') +
        P('M 190 386 C 214 374, 286 374, 310 386 C 316 440, 316 520, 310 572 L 190 572 C 184 520, 184 440, 190 386 Z', '#17171a') +
        P('M 190 386 C 176 402, 170 426, 170 448 L 204 456 C 202 430, 206 404, 218 388 Z', '#17171a') +
        M(P('M 190 386 C 176 402, 170 426, 170 448 L 204 456 C 202 430, 206 404, 218 388 Z', '#17171a')) +
        P('M 228 384 C 238 392, 262 392, 272 384 C 266 380, 234 380, 228 384 Z', '#2a2a2e') +
        // 胸前涂鸦印花
        R(222, 440, 56, 30, '#c0392b', 3, 'opacity=".9"') + R(226, 476, 48, 12, '#2d6cdf', 2, 'opacity=".9"') +
        S('M 230 450 L 240 460 M 244 448 L 252 462 M 258 448 L 266 460', '#fff', 3)
      );
    },
    // 9 灰围巾大衣
    scarf() {
      return G(
        P('M 214 560 L 248 560 L 246 680 L 218 680 Z', '#1f1f24') + M(P('M 214 560 L 248 560 L 246 680 L 218 680 Z', '#1f1f24')) +
        boots('#2b2b2f') +
        P('M 190 386 C 214 374, 286 374, 310 386 C 320 450, 322 530, 318 600 L 182 600 C 178 530, 180 450, 190 386 Z', '#4a4e58') +
        longSleeveL('#4a4e58') + M(longSleeveL('#4a4e58')) +
        S('M 250 430 L 250 596', '#3a3e47', 2) + C(250, 470, 3, '#2a2d34') + C(250, 510, 3, '#2a2d34') +
        // 大围巾
        P('M 206 346 C 224 330, 276 330, 294 346 C 312 368, 312 396, 300 412 C 282 426, 218 426, 200 412 C 188 396, 188 368, 206 346 Z', 'url(#knit)') +
        P('M 212 404 C 226 416, 274 416, 288 404 L 296 470 C 280 478, 220 478, 204 470 Z', 'url(#knit)') +
        P('M 212 404 C 226 416, 274 416, 288 404', '#000', 'opacity=".12"') +
        S('M 212 470 L 216 482 M 226 474 L 228 486 M 240 476 L 240 488 M 254 476 L 254 488 M 268 474 L 270 486 M 282 470 L 286 482', '#5d636e', 3)
      );
    },
    // 10 淡紫吊带裙
    lilac() {
      return G(
        P('M 212 690 L 250 690 L 252 702 L 210 702 Z', '#d9cfc0') + M(P('M 212 690 L 250 690 L 252 702 L 210 702 Z', '#d9cfc0')) +
        skirt('url(#satin)', 466, 606, 30) +
        P('M 210 398 C 226 390, 274 390, 290 398 C 300 430, 300 450, 299 470 L 201 470 C 200 450, 200 430, 210 398 Z', 'url(#satin)') +
        P('M 212 400 C 230 420, 270 420, 288 400 C 270 408, 230 408, 212 400 Z', '#fff', 'opacity=".3"') +
        S('M 214 400 L 206 384 M 286 400 L 294 384', '#c3ace0', 2.5) +
        // 珍珠项链
        S('M 232 348 C 238 364, 262 364, 268 348', '#fff', 4, 'stroke-dasharray="0 6.2" stroke-linecap="round"')
      );
    },
    // 隐藏款 生日白裙
    birthday() {
      return G(
        P('M 214 690 L 250 690 L 252 702 L 210 702 Z', '#f3eef0') + M(P('M 214 690 L 250 690 L 252 702 L 210 702 Z', '#f3eef0')) +
        skirt('#fff', 466, 690, 60) + skirt('url(#tulle)', 466, 700, 72) +
        scallops(130, 370, 696, 7, '#fff', 12) +
        strapless('#fff', 412) +
        scallops(208, 292, 410, 4.5, '#fff', -6) +
        P('M 206 414 C 224 426, 276 426, 294 414 C 280 420, 220 420, 206 414 Z', '#000', 'opacity=".08"') +
        // 珍珠项链
        S('M 230 346 C 238 366, 262 366, 270 346', '#fff', 5, 'stroke-dasharray="0 7" stroke-linecap="round"') +
        S('M 230 346 C 238 366, 262 366, 270 346', '#d8c9c9', 1, 'opacity=".6"')
      );
    },
  };

  /* ---------- 头饰 ---------- */
  const HEADWEAR = {
    none: () => '',
    catears() {
      const ear = P('M 166 150 C 160 118, 172 96, 190 84 C 206 100, 214 122, 214 142 Z', '#1d1b1f') +
        P('M 176 144 C 174 126, 182 110, 190 100 C 200 112, 206 128, 206 140 Z', '#fff', 'opacity=".9"');
      return S('M 156 190 C 190 136, 310 136, 344 190', '#1d1b1f', 7) + ear + M(ear);
    },
    tiara() {
      return G(
        S('M 176 162 C 210 134, 290 134, 324 162', '#cfd5e2', 5) +
        P('M 196 150 L 206 116 L 220 144 L 236 104 L 250 136 L 264 104 L 280 144 L 294 116 L 304 150 Z', '#e5e9f2') +
        C(206, 118, 4, '#f6c9e0') + C(236, 106, 5, '#bde0ff') + C(264, 106, 5, '#bde0ff') + C(294, 118, 4, '#f6c9e0') +
        C(250, 134, 5, '#fff')
      );
    },
    duck() {
      return G(
        P('M 150 170 C 150 110, 200 72, 250 72 C 300 72, 350 110, 350 170 C 320 158, 280 152, 250 152 C 220 152, 180 158, 150 170 Z', '#f9c935') +
        P('M 152 172 C 200 160, 300 160, 348 172 C 348 184, 340 190, 330 186 C 300 176, 200 176, 170 186 C 160 190, 152 184, 152 172 Z', '#f0b81e') +
        P('M 226 128 C 230 112, 270 112, 274 128 C 270 138, 230 138, 226 128 Z', '#f08c2b') +
        C(222, 112, 5, '#2a2a2a') + C(278, 112, 5, '#2a2a2a') + C(220, 110, 1.6, '#fff') + C(276, 110, 1.6, '#fff')
      );
    },
    pandahat() {
      const flap = P('M 158 196 C 150 230, 152 262, 160 290 C 170 292, 180 286, 184 276 C 182 246, 180 216, 182 196 Z', '#f6f3ee') +
        S('M 160 292 L 156 330', '#2a2a2a', 3) + C(156, 334, 6, '#fff');
      const ear = C(176, 112, 22, '#2a2a2a');
      return G(
        ear + M(ear) +
        P('M 150 198 C 146 120, 196 72, 250 72 C 304 72, 354 120, 350 198 C 320 186, 280 180, 250 180 C 220 180, 180 186, 150 198 Z', '#f6f3ee') +
        E(216, 140, 14, 11, '#2a2a2a', 'transform="rotate(-20 216 140)"') + E(284, 140, 14, 11, '#2a2a2a', 'transform="rotate(20 284 140)"') +
        C(218, 140, 4, '#fff') + C(282, 140, 4, '#fff') +
        E(250, 164, 7, 5, '#2a2a2a') +
        flap + M(flap)
      );
    },
    redclips() {
      return G(
        R(170, 192, 22, 6, '#e8333a', 3, 'transform="rotate(-24 181 195)"') + R(174, 202, 22, 6, '#e8333a', 3, 'transform="rotate(-24 185 205)"') +
        R(308, 192, 22, 6, '#e8333a', 3, 'transform="rotate(24 319 195)"')
      );
    },
    whitebows() {
      return bow(170, 212, 8, '#fff', '#eee') + bow(330, 212, 8, '#fff', '#eee');
    },
    blackbows() {
      return bow(158, 262, 9, '#1d1b1f', '#333') + bow(342, 262, 9, '#1d1b1f', '#333');
    },
  };

  /* ---------- 配饰 ---------- */
  const ACC = {
    none: () => '',
    strawbag() {
      return G(
        S('M 206 388 C 230 430, 258 470, 276 500', '#e23b3b', 7) +
        P('M 262 502 C 236 508, 230 544, 252 566 C 262 576, 286 576, 296 566 C 318 544, 312 508, 286 502 Z', '#e8333a') +
        P('M 258 500 C 262 490, 272 486, 274 496 C 278 486, 290 488, 292 500 C 282 498, 268 498, 258 500 Z', '#4caf50') +
        C(254, 528, 1.6, '#fff1a8') + C(266, 540, 1.6, '#fff1a8') + C(280, 526, 1.6, '#fff1a8') + C(290, 544, 1.6, '#fff1a8') + C(270, 556, 1.6, '#fff1a8') + C(258, 548, 1.6, '#fff1a8') + C(284, 556, 1.6, '#fff1a8')
      );
    },
    cat() {
      // 坐在脚边的小猫
      return G(
        E(336, 672, 30, 22, '#b89a7a') + P('M 318 650 C 320 640, 330 636, 338 646 C 346 636, 358 640, 358 650 L 356 664 L 322 664 Z', '#b89a7a') +
        E(338, 668, 18, 12, '#f2e7d8') +
        S('M 362 668 C 380 660, 386 640, 376 628', '#b89a7a', 8) +
        S('M 326 650 L 332 660 M 350 650 L 344 660', '#8b6f55', 2) +
        C(331, 654, 2, '#2a2a2a') + C(345, 654, 2, '#2a2a2a') + P('M 336 660 L 340 660 L 338 663 Z', '#e59aa4') +
        S('M 312 660 L 326 662 M 364 660 L 350 662 M 312 668 L 326 666 M 364 668 L 350 666', '#2a2a2a', 1, 'opacity=".6"') +
        S('M 320 676 L 324 690 M 350 676 L 348 690', '#a88968', 6)
      );
    },
    teddyphone() {
      return G(
        R(170, 500, 30, 50, '#8a5a3a', 8, 'transform="rotate(-12 185 525)"') +
        C(176, 504, 7, '#8a5a3a') + C(196, 500, 7, '#8a5a3a') +
        E(186, 522, 9, 7, '#c99a6a') + C(182, 514, 1.6, '#2a2a2a') + C(190, 513, 1.6, '#2a2a2a') + E(186, 520, 2.4, 1.6, '#2a2a2a') +
        bow(188, 498, 4, '#e8c060')
      );
    },
    bouquet() {
      const roses = [[300, 556], [322, 548], [340, 566], [310, 580], [332, 588], [348, 586], [296, 590], [318, 606], [338, 608]];
      let s = P('M 292 560 L 352 560 L 366 630 L 278 630 Z', '#111') + P('M 278 630 L 366 630 L 358 650 L 286 650 Z', '#111');
      roses.forEach(([x, y]) => { s += C(x, y, 13, '#e9a9c7') + C(x - 3, y - 3, 7, '#f4c6db') + C(x + 1, y, 3, '#d991b3'); });
      s += S('M 296 572 C 300 584, 312 590, 324 586 M 318 598 C 326 604, 336 602, 342 596', '#5a9a5a', 2);
      return G(s);
    },
    pizza() {
      return G(
        E(176, 548, 30, 10, '#f3e4cf') + C(176, 540, 26, '#e5b86a') + C(176, 540, 22, '#d9402a') + C(176, 540, 19, '#f6d56a') +
        C(168, 532, 5, '#c0392b') + C(184, 546, 5, '#c0392b') + C(176, 528, 4, '#c0392b') + E(170, 548, 4, 3, '#4caf50') + E(186, 534, 4, 3, '#4caf50')
      );
    },
    cocktail() {
      return G(
        P('M 300 500 L 340 500 L 322 530 L 318 530 Z', '#fff', 'opacity=".55"') +
        P('M 302 503 L 338 503 L 322 528 L 318 528 Z', '#f6a04a') +
        S('M 320 530 L 320 548 M 310 550 L 330 550', '#ddd', 3) +
        C(336, 500, 4, '#f08c2b') + S('M 322 500 L 330 486', '#eee', 1.5)
      );
    },
    pearls() {
      return S('M 231 346 C 238 366, 262 366, 269 346', '#fff', 5, 'stroke-dasharray="0 7" stroke-linecap="round"') +
        S('M 231 346 C 238 366, 262 366, 269 346', '#d8c9c9', 1, 'opacity=".5"');
    },
  };

  /* ---------- 发型表 ---------- */
  const HAIRS = {
    long: () => hairLongStraight(HAIR_PAL.brown),
    twin: () => hairTwinTails(HAIR_PAL.brown, '#e8485a'),
    twinpink: () => hairTwinTails(HAIR_PAL.brown, '#f7b6c9'),
    wavy: () => hairLongWavy(HAIR_PAL.lightbrown, 'air'),
    blonde: () => hairLongWavy(HAIR_PAL.blonde, 'curtain'),
    orange: () => hairLongWavy(HAIR_PAL.orange, 'curtain'),
  };
  const HAIR_BROW = { long: '#3b2a24', twin: '#3b2a24', twinpink: '#3b2a24', wavy: '#5a3f33', blonde: '#8c6a3a', orange: '#9a5a28' };

  /* ---------- 组装 ---------- */
  function compose(state, opts = {}) {
    const hair = HAIRS[state.hair]();
    const outfit = (OUTFITS[state.outfit] || OUTFITS.strawberry)();
    const acc = (ACC[state.acc] || ACC.none)();
    const hw = (HEADWEAR[state.head] || HEADWEAR.none)();
    const parts = [
      hair.back, bodyBack(), outfit, acc, hair.mid, head(), face(HAIR_BROW[state.hair] || '#3b2a24'), hair.front, hw,
    ];
    return `<g class="avatar-root">${parts.join('')}</g>`;
  }
  function svg(state, { viewBox = `0 0 ${W} ${H}`, cls = '', withDefs = false, extra = '' } = {}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}" ${extra}>${withDefs ? `<defs>${DEFS}</defs>` : ''}${compose(state)}</svg>`;
  }
  // 单件预览（用于衣柜小卡片）
  function preview(kind, id) {
    let inner = '', vb = `0 0 ${W} ${H}`;
    const ghost = (f) => `<g opacity=".35">${f}</g>`;
    if (kind === 'hair') {
      const h = HAIRS[id]();
      inner = h.back + ghost(bodyBack()) + h.mid + head() + face(HAIR_BROW[id]) + h.front;
      vb = '100 60 300 360';
    } else if (kind === 'head') {
      const h = HAIRS.long();
      inner = h.back + head() + face('#3b2a24') + h.front + HEADWEAR[id]();
      vb = '110 40 280 260';
    } else if (kind === 'outfit') {
      inner = ghost(bodyBack()) + OUTFITS[id]();
      vb = '120 330 260 400';
    } else if (kind === 'acc') {
      const boxes = { strawbag: '200 370 130 230', cat: '280 600 120 120', teddyphone: '140 470 100 100', bouquet: '260 530 130 140', pizza: '130 500 100 80', cocktail: '280 470 80 100', pearls: '200 320 100 70' };
      inner = ghost(bodyBack() + head()) + ACC[id]();
      vb = boxes[id] || vb;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="pv">${inner}</svg>`;
  }

  return { W, H, DEFS, compose, svg, preview, HAIRS, OUTFITS, HEADWEAR, ACC };
})();

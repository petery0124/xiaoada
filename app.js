(function () {
  const $ = s => document.querySelector(s);
  document.getElementById('svgdefs').innerHTML = AV.DEFS;
  const DEBUG = /debug/.test(location.search);

  /* ---------- 存储 ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('xad_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('xad_' + k, JSON.stringify(v)); } catch (e) { } },
  };
  const state = Object.assign({ outfit: 'strawberry', hair: 'twin', head: 'redclips', acc: 'strawbag', bg: 'pinkroom' }, store.get('state', {}));
  const tried = new Set(store.get('tried', []));
  let unlocked = store.get('unlocked', false);
  let tab = 'outfit';

  /* ---------- 资源模式 ----------
   * assets/looks/base.png 存在 → 整张立绘模式（每套衣服一张 PNG，头饰配饰是贴纸叠上去）
   * 不存在 → 用 avatar.js 里的 SVG 形象兜底
   */
  let imgMode = false;
  const looks = {};    // outfitId -> true/false
  const stickers = {}; // stickerId -> true/false
  // 贴纸位置：相对立绘图框的百分比（x,y 是中心点，w 是宽度）。图到了以后用 ?debug 模式拖一拖校准。
  // 按基础立绘量过：头顶 5.5%，下巴 21.5%，头宽约 17%，肩 24%，手掌 53%（左手 x29% / 右手 x70%），腰 36%，裙摆 62%，脚底 97%
  const STICKER_POS = Object.assign({
    catears: { x: 49.5, y: 7.5, w: 22 }, tiara: { x: 49.5, y: 6.5, w: 14 }, duck: { x: 49.5, y: 6, w: 24 }, pandahat: { x: 49.5, y: 9, w: 26 },
    redclips: { x: 44, y: 12, w: 8 }, whitebows: { x: 49.5, y: 10, w: 20 }, blackbows: { x: 49.5, y: 16, w: 24 },
    strawbag: { x: 58, y: 46, w: 13 }, cat: { x: 74, y: 93, w: 16 }, teddyphone: { x: 29, y: 54, w: 8 },
    bouquet: { x: 68, y: 52, w: 26 }, pizza: { x: 27, y: 55, w: 16 }, cocktail: { x: 70, y: 52, w: 8 }, pearls: { x: 49.5, y: 23.5, w: 10 },
  }, DEBUG ? store.get('stickerPos', {}) : {});
  const probe = src => new Promise(res => { const im = new Image(); im.onload = () => res(true); im.onerror = () => res(false); im.src = src; });
  const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

  // 立绘模式下，头饰/配饰只有在有贴纸图时才出现（立绘里本来就画了原版的头饰和配饰）
  const anySticker = () => Object.values(stickers).some(Boolean);
  const kinds = () => imgMode
    ? [['outfit', '穿搭'], ...(anySticker() ? [['head', '头饰'], ['acc', '配饰']] : []), ['bg', '背景']]
    : [['outfit', '衣服'], ['hair', '发型'], ['head', '头饰'], ['acc', '配饰'], ['bg', '背景']];
  const byId = (kind, id) => DATA[kind].find(i => i.id === id) || DATA[kind][0];
  const total = DATA.outfit.filter(o => !o.hidden).length;
  function listFor(kind) {
    let list = DATA[kind];
    if (kind === 'outfit') return list; // 隐藏款也在列表里（带锁）
    if (imgMode && (kind === 'head' || kind === 'acc')) list = list.filter(i => i.id === 'none' || stickers[i.id]);
    return list.filter(i => !i.hidden || unlocked);
  }
  const hasLook = id => imgMode && looks[id] !== false;

  /* ---------- 渲染 ---------- */
  function render() {
    const o = byId('outfit', state.outfit);
    const wrap = $('#avatarWrap');
    if (imgMode) {
      // 这套还没有立绘图时，先用基础立绘顶着
      const src = hasLook(o.id) ? `assets/looks/${o.id}.png` : 'assets/looks/base.png';
      wrap.innerHTML = `<div class="look-box" id="lookBox"><img class="look" src="${src}" alt="" decoding="async"><div class="spinner"></div>${stickerHTML()}</div>`;
      const im = wrap.querySelector('.look');
      im.onerror = () => { if (hasLook(o.id)) { looks[o.id] = false; render(); renderItems(); } };
      im.onload = () => im.classList.add('ready');
      if (im.complete && im.naturalWidth) im.classList.add('ready');
      fitLook();
    } else {
      wrap.innerHTML = AV.svg(state);
    }
    const bg = byId('bg', state.bg);
    $('#bg').style.backgroundImage = bg.img ? `url(assets/bg/${bg.img}.jpg)` : 'linear-gradient(160deg,#fff3e9,#ffe3ec)';
    $('#refThumb').src = `assets/thumb/${o.photo}.jpg`;
    $('#progress').textContent = unlocked ? '衣柜已全部解锁 ✨' : `已试穿 ${Math.min(tried.size, total)}/${total}`;
    $('#btnLetter').classList.toggle('hidden', !unlocked);
    store.set('state', state);
  }
  function stickerHTML() {
    return ['head', 'acc'].map(k => state[k]).filter(id => id && id !== 'none' && stickers[id]).map(id => {
      const p = STICKER_POS[id] || { x: 50, y: 50, w: 30 };
      return `<img class="sticker" data-id="${id}" src="assets/stickers/${id}.png" style="left:${p.x}%;top:${p.y}%;width:${p.w}%" alt="" draggable="false">`;
    }).join('');
  }
  function fitLook() {
    const box = $('#lookBox'); if (!box) return;
    const st = $('#stage').getBoundingClientRect();
    const h = st.height - 80, w = Math.min(h * 2 / 3, st.width - 24);
    box.style.width = w + 'px'; box.style.height = (w * 1.5) + 'px';
  }
  window.addEventListener('resize', fitLook);

  function renderTabs() {
    $('#tabs').innerHTML = kinds().map(([k, n]) => `<button class="tab ${k === tab ? 'active' : ''}" data-k="${k}">${n}</button>`).join('');
  }
  function previewHTML(kind, item) {
    if (kind === 'bg') return item.img ? `<img src="assets/thumb/${item.img}.jpg" alt="">` : `<div class="pv"></div>`;
    if (imgMode) {
      if (kind === 'outfit') {
        if (looks[item.id] !== false) return `<img class="contain" src="assets/looks-thumb/${item.id}.png" alt="" loading="lazy" decoding="async" data-look="${item.id}">`;
        return `<img src="assets/thumb/${item.photo}.jpg" alt="">`; // 还没画好的那套先放原图
      }
      if (item.id === 'none') return `<div class="pv none">✕</div>`;
      if (kind === 'head' || kind === 'acc') return `<img class="contain sticker-pv" src="assets/stickers/${item.id}.png" alt="">`;
    }
    return AV.preview(kind, item.id);
  }
  function renderItems() {
    const list = listFor(tab);
    $('#items').innerHTML = list.map(item => {
      const locked = item.hidden && !unlocked;
      const active = state[tab] === item.id;
      return `<button class="item ${active ? 'active' : ''} ${locked ? 'locked' : ''} ${item.id === 'cream' ? 'cream-swatch' : ''}" data-id="${item.id}">
        ${previewHTML(tab, item)}<span class="nm">${locked ? '？？？' : item.name}</span>${item.hidden && unlocked ? '<span class="badge">限定</span>' : ''}
      </button>`;
    }).join('');
    const act = $('#items .item.active');
    if (act) act.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function say(text) {
    const b = $('#bubble');
    b.textContent = text;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }

  /* ---------- 交互 ---------- */
  function pick(kind, id) {
    const item = byId(kind, id);
    if (kind === 'outfit') {
      if (item.hidden && !unlocked) { say('试穿完所有衣服，衣柜深处会有东西。'); return; }
      if (imgMode) { state.bg = (item.set && item.set.bg) || state.bg; state.head = 'none'; state.acc = 'none'; }
      else Object.assign(state, item.set || {});
      if (!item.hidden) tried.add(id);
      store.set('tried', [...tried]);
    }
    state[kind] = id;
    render(); renderItems();
    say(item.line || item.name);
    checkUnlock();
  }
  function checkUnlock() {
    if (unlocked) return;
    if (DATA.outfit.filter(o => !o.hidden).every(o => tried.has(o.id))) {
      unlocked = true; store.set('unlocked', true);
      confetti();
      setTimeout(() => { render(); renderItems(); openLetter(true); }, 900);
    }
  }
  function randomize() {
    const r = arr => arr[Math.floor(Math.random() * arr.length)];
    for (const [k] of kinds()) {
      const pool = listFor(k).filter(i => !i.hidden || unlocked);
      if (pool.length) state[k] = r(pool).id;
    }
    const o = byId('outfit', state.outfit); if (!o.hidden) tried.add(o.id); store.set('tried', [...tried]);
    render(); renderItems();
    say(r(['随机搭配，看看合不合适？', '这套……好像也不错？', '换个风格试试。', '衣柜摇了摇，掉出来这套。']));
    checkUnlock(); bounce();
  }
  function bounce() { const w = $('#avatarWrap'); w.classList.remove('bounce'); void w.offsetWidth; w.classList.add('bounce'); }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti';
    const glyphs = ['🎀', '✨', '💗', '🍓', '🌸', '⭐'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      s.style.fontSize = 14 + Math.random() * 16 + 'px';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3800);
  }
  function hearts(x, y) {
    const stage = $('#stage'); const rect = stage.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const h = document.createElement('span'); h.className = 'heart';
      h.textContent = ['💗', '✨', '🌸'][i % 3];
      h.style.left = (x - rect.left + (Math.random() - .5) * 60) + 'px';
      h.style.top = (y - rect.top - 10) + 'px';
      h.style.animationDelay = (i * 0.06) + 's';
      stage.appendChild(h); setTimeout(() => h.remove(), 1200);
    }
  }

  /* ---------- 弹层 ---------- */
  function openLetter(first) {
    const L = DATA.letter;
    $('#letterTitle').textContent = first ? '衣柜最深处，还有一件 ✨' : L.title;
    $('#letterBody').innerHTML = L.body.map(p => `<p>${p}</p>`).join('') + `<p class="sign">—— ${L.sign}</p>`;
    $('#letterHint').textContent = first ? '生日限定款已经放进衣柜了，去看看。' : '';
    $('#letter').classList.remove('hidden');
  }
  function openLightbox() {
    const o = byId('outfit', state.outfit);
    $('#lbImg').src = `assets/photo/${o.photo}.jpg`;
    $('#lbCap').textContent = `${o.name} · 原图`;
    $('#lightbox').classList.remove('hidden');
  }

  /* ---------- 拍照：合成一张可保存的海报 ---------- */
  async function makePoster() {
    say('咔嚓，正在冲洗照片……');
    const Wp = 1080, Hp = 1700, cv = document.createElement('canvas'); cv.width = Wp; cv.height = Hp;
    const ctx = cv.getContext('2d');
    const bg = byId('bg', state.bg);
    ctx.fillStyle = '#ffe9ef'; ctx.fillRect(0, 0, Wp, Hp);
    if (bg.img) {
      try {
        const im = await loadImg(`assets/bg/${bg.img}.jpg`);
        const s = Math.max(Wp / im.width, Hp / im.height) * 1.2;
        ctx.save(); if ('filter' in ctx) ctx.filter = 'blur(40px) saturate(1.15)';
        ctx.drawImage(im, (Wp - im.width * s) / 2, (Hp - im.height * s) / 2, im.width * s, im.height * s); ctx.restore();
      } catch (e) { }
    } else {
      const g = ctx.createLinearGradient(0, 0, Wp, Hp); g.addColorStop(0, '#fff3e9'); g.addColorStop(1, '#ffe3ec'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wp, Hp);
    }
    const veil = ctx.createLinearGradient(0, 0, 0, Hp); veil.addColorStop(0, 'rgba(255,255,255,.25)'); veil.addColorStop(.5, 'rgba(255,255,255,0)'); veil.addColorStop(1, 'rgba(255,255,255,.7)');
    ctx.fillStyle = veil; ctx.fillRect(0, 0, Wp, Hp);

    const o = byId('outfit', state.outfit);
    const h = 1160, y = 190;
    try {
      if (hasLook(o.id)) {
        const im = await loadImg(`assets/looks/${o.id}.png`);
        const w = h * 2 / 3, x = (Wp - w) / 2;
        ctx.save(); ctx.shadowColor = 'rgba(110,50,75,.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
        ctx.drawImage(im, x, y, w, h); ctx.restore();
        for (const id of [state.head, state.acc]) {
          if (!id || id === 'none' || !stickers[id]) continue;
          const p = STICKER_POS[id]; const s = await loadImg(`assets/stickers/${id}.png`);
          const sw = w * p.w / 100, sh = sw * s.height / s.width;
          ctx.drawImage(s, x + w * p.x / 100 - sw / 2, y + h * p.y / 100 - sh / 2, sw, sh);
        }
      } else {
        const svgStr = AV.svg(state, { withDefs: true, extra: `width="${AV.W}" height="${AV.H}"` });
        const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));
        const im = await loadImg(url);
        const w = h * AV.W / AV.H;
        ctx.save(); ctx.shadowColor = 'rgba(110,50,75,.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
        ctx.drawImage(im, (Wp - w) / 2, y, w, h); ctx.restore();
        URL.revokeObjectURL(url);
      }
    } catch (e) { console.warn('poster', e); }

    const font = w => `${w} -apple-system, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = '#5b474d';
    ctx.font = font('800 54px'); ctx.fillText(`${DATA.name}的换装小屋`, Wp / 2, 100);
    roundRect(ctx, 90, 1390, Wp - 180, 190, 36, 'rgba(255,255,255,.9)');
    ctx.fillStyle = '#f08aa6'; ctx.font = font('700 44px'); ctx.fillText(o.name, Wp / 2, 1465);
    ctx.fillStyle = '#5b474d'; ctx.font = font('500 34px'); ctx.fillText(o.line, Wp / 2, 1530);
    ctx.fillStyle = '#a3909a'; ctx.font = font('500 26px'); ctx.fillText('长按保存 · 发给朋友炫耀一下', Wp / 2, 1640);
    $('#posterImg').src = cv.toDataURL('image/jpeg', .92);
    $('#poster').classList.remove('hidden');
    say(o.line);
  }
  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  /* ---------- 事件 ---------- */
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (!b) return; tab = b.dataset.k; renderTabs(); renderItems(); });
  $('#items').addEventListener('click', e => { const b = e.target.closest('.item'); if (!b) return; pick(tab, b.dataset.id); });
  // 某套立绘图不存在 → 这套退回 SVG 形象
  $('#items').addEventListener('error', e => {
    const id = e.target && e.target.dataset && e.target.dataset.look; if (!id) return;
    looks[id] = false;
    const item = byId('outfit', id); e.target.outerHTML = `<img src="assets/thumb/${item.photo}.jpg" alt="">`; // 只换这一张，不整列重画
  }, true);
  $('#btnRandom').addEventListener('click', randomize);
  $('#btnPhoto').addEventListener('click', makePoster);
  $('#btnLetter').addEventListener('click', () => openLetter(false));
  $('#btnPhotoRef').addEventListener('click', openLightbox);
  $('#avatarWrap').addEventListener('click', e => { if (DEBUG && e.target.closest('.sticker')) return; hearts(e.clientX, e.clientY); bounce(); });
  document.querySelectorAll('.overlay .close, .overlay .pill').forEach(b => b.addEventListener('click', e => e.target.closest('.overlay').classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o && !o.classList.contains('intro')) o.classList.add('hidden'); }));
  // 微信/iOS：禁掉双指缩放和双击放大
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

  // 开场
  $('#closet').addEventListener('click', () => {
    const c = $('#closet'); if (c.classList.contains('open')) return;
    c.classList.add('open');
    setTimeout(() => { $('#intro').classList.add('fade'); say(byId('outfit', state.outfit).line); }, 700);
    setTimeout(() => $('#intro').remove(), 1400);
  });
  $('#introName').textContent = DATA.name;
  $('#topName').textContent = DATA.name;

  /* ---------- 调位模式（?debug）：拖动贴纸、滚轮缩放，结果打印在气泡和控制台 ---------- */
  if (DEBUG) {
    document.body.classList.add('debug');
    let drag = null;
    const wrap = $('#avatarWrap');
    wrap.addEventListener('pointerdown', e => {
      const s = e.target.closest('.sticker'); if (!s) return;
      drag = { id: s.dataset.id, el: s, box: $('#lookBox').getBoundingClientRect() };
      s.setPointerCapture(e.pointerId); e.preventDefault();
    });
    wrap.addEventListener('pointermove', e => {
      if (!drag) return;
      const p = STICKER_POS[drag.id];
      p.x = +((e.clientX - drag.box.left) / drag.box.width * 100).toFixed(1);
      p.y = +((e.clientY - drag.box.top) / drag.box.height * 100).toFixed(1);
      drag.el.style.left = p.x + '%'; drag.el.style.top = p.y + '%';
    });
    wrap.addEventListener('pointerup', () => {
      if (!drag) return;
      store.set('stickerPos', STICKER_POS);
      say(`${drag.id}: ${JSON.stringify(STICKER_POS[drag.id])}`); console.log('STICKER_POS', JSON.stringify(STICKER_POS));
      drag = null;
    });
    wrap.addEventListener('wheel', e => {
      const s = e.target.closest('.sticker'); if (!s) return; e.preventDefault();
      const p = STICKER_POS[s.dataset.id]; p.w = +Math.max(4, p.w - Math.sign(e.deltaY)).toFixed(1);
      s.style.width = p.w + '%'; store.set('stickerPos', STICKER_POS); say(`${s.dataset.id}: ${JSON.stringify(p)}`);
    }, { passive: false });
  }

  /* ---------- 启动 ---------- */
  (async function init() {
    renderTabs(); renderItems(); render();
    $('#bubble').textContent = '点下面的衣柜，给她换一套试试。';
    imgMode = await probe('assets/looks/base.png');
    if (imgMode) {
      $('.closet-inside').innerHTML = `<img src="assets/looks/base.png" alt="">`;
      if (!kinds().some(([k]) => k === tab)) tab = 'outfit';
      renderTabs(); renderItems(); render();
      // 立绘按需加载（每张可能上 MB，不一次全拉）；贴纸小，先探测一遍
      await Promise.all([...DATA.head, ...DATA.acc].filter(i => i.id !== 'none').map(i => probe(`assets/stickers/${i.id}.png`).then(ok => stickers[i.id] = ok)));
      if (!kinds().some(([k]) => k === tab)) tab = 'outfit';
      renderTabs(); renderItems(); render();
    }
  })();
})();

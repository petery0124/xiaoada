(function () {
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 存储与状态 ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('xad_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('xad_' + k, JSON.stringify(v)); } catch (e) { } },
  };
  const saved = store.get('state', {});
  const state = { outfit: saved.outfit || 'strawberry', bg: saved.bg || 'pinkroom' };
  const tried = new Set(store.get('tried', []));
  let unlocked = store.get('unlocked', false);
  let musicOn = store.get('music', true);
  let theme = store.get('theme', 'theater'); // theater = 剧场版（深色）, princess = 公主风（粉嫩）
  let tab = 'outfit', posterTpl = 'mag';

  const byId = (kind, id) => DATA[kind].find(i => i.id === id) || DATA[kind][0];
  const visibleOutfits = () => DATA.outfit.filter(o => !o.hidden);
  const total = visibleOutfits().length;
  const KINDS = [['outfit', '穿搭'], ['bg', '背景']];
  const lookSrc = id => `assets/looks/${id}.png`;
  const thumbSrc = id => `assets/looks-thumb/${id}.png`;
  const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

  /* ---------- 粒子特效（canvas） ---------- */
  const FX = (() => {
    const cv = $('#fx'), ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, theme = 'sparkle', parts = [], bursts = [], raf = 0, t0 = performance.now();
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const THEMES = {
      petals: { n: 26, make: () => ({ x: rnd(0, W), y: rnd(-H, H), s: rnd(5, 11), vx: rnd(-.25, .25), vy: rnd(.35, .8), r: rnd(0, 6.3), vr: rnd(-.03, .03), a: rnd(.45, .85), c: pick(['#f9c5d1', '#f7a8b8', '#ffdbe4', '#fff1f4']), ph: rnd(0, 6.3) }) },
      sparkle: { n: 30, make: () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(1.5, 3.6), vx: rnd(-.1, .1), vy: rnd(-.25, -.08), a: rnd(.4, .9), c: pick(['#fff3dc', '#f5dcc8', '#ffffff']), ph: rnd(0, 6.3) }) },
      bubbles: { n: 24, make: () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(3, 11), vx: 0, vy: rnd(-.5, -.2), a: rnd(.25, .6), ph: rnd(0, 6.3) }) },
      stars: { n: 70, make: () => ({ x: rnd(0, W), y: rnd(0, H * .8), s: rnd(.8, 2.2), vx: 0, vy: 0, a: rnd(.3, .9), ph: rnd(0, 6.3) }) },
      bokeh: { n: 16, make: () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(14, 42), vx: rnd(-.15, .15), vy: rnd(-.12, .12), a: rnd(.08, .2), c: pick(['#ffd9a8', '#ffb98a', '#fff1dc', '#f6c6d2']), ph: rnd(0, 6.3) }) },
      snow: { n: 60, make: () => ({ x: rnd(0, W), y: rnd(-H, H), s: rnd(1.2, 3.4), vx: rnd(-.2, .2), vy: rnd(.4, 1), a: rnd(.4, .9), ph: rnd(0, 6.3) }) },
      confetti: { n: 34, make: () => ({ x: rnd(0, W), y: rnd(-H, H), s: rnd(4, 8), vx: rnd(-.3, .3), vy: rnd(.6, 1.2), r: rnd(0, 6.3), vr: rnd(-.08, .08), a: rnd(.6, .95), c: pick(['#f6b9c9', '#f5dcc8', '#ffffff', '#e7bfa8', '#d7b6e6']), ph: rnd(0, 6.3) }) },
    };
    function resize() {
      const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setTheme(theme, true);
    }
    function setTheme(name, force) {
      if (!force && name === theme) return;
      theme = THEMES[name] ? name : 'sparkle';
      const T = THEMES[theme]; parts = Array.from({ length: reduced ? 0 : T.n }, T.make);
    }
    function star(x, y, s, a, c) {
      ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rr = i % 2 ? s * .38 : s; ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
      ctx.closePath(); ctx.fill();
    }
    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx + (p.ph ? Math.sin(t * .7 + p.ph) * .25 : 0); p.y += p.vy;
        if (p.r !== undefined) p.r += p.vr;
        if (p.y > H + 20) { p.y = -20; p.x = rnd(0, W); } if (p.y < -20) { p.y = H + 20; p.x = rnd(0, W); }
        if (p.x > W + 20) p.x = -20; if (p.x < -20) p.x = W + 20;
        const tw = .55 + .45 * Math.sin(t * 2 + p.ph);
        if (theme === 'petals') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else if (theme === 'sparkle') {
          star(p.x, p.y, p.s * (0.7 + tw * .5), p.a * tw, p.c);
        } else if (theme === 'bubbles') {
          ctx.globalAlpha = p.a * .9; ctx.strokeStyle = 'rgba(210,240,255,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = p.a * .5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - p.s * .35, p.y - p.s * .35, p.s * .22, 0, Math.PI * 2); ctx.fill();
        } else if (theme === 'stars') {
          ctx.globalAlpha = p.a * tw; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
        } else if (theme === 'bokeh') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s); g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = p.a * (0.8 + tw * .3); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
        } else if (theme === 'snow') {
          ctx.globalAlpha = p.a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
        } else if (theme === 'confetti') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
        }
      }
      // 换装时的星光爆发
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]; b.life -= 1 / 60; if (b.life <= 0) { bursts.splice(i, 1); continue; }
        b.x += b.vx; b.y += b.vy; b.vy += .04; b.vx *= .985;
        star(b.x, b.y, b.s * Math.min(1, b.life * 2.2), Math.min(1, b.life * 1.5), b.c);
      }
      ctx.globalAlpha = 1;
    }
    function burst(x, y, n = 26) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const ang = rnd(0, Math.PI * 2), sp = rnd(1.2, 4.2);
        bursts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1, s: rnd(2.5, 6), life: rnd(.6, 1.1), c: pick(['#fff3dc', '#f5dcc8', '#ffffff', '#f6b9c9']) });
      }
    }
    addEventListener('resize', resize);
    resize(); raf = requestAnimationFrame(draw);
    return { setTheme, burst, resize };
  })();

  /* ---------- 八音盒背景音（Web Audio 合成，没有外部音频文件） ---------- */
  const Music = (() => {
    let ac, master, wet, timer, next = 0, step = 0, on = false, track = 'theater';
    // 两首曲子：剧场版是慢一点的八音盒；公主风是 3/4 拍的华尔兹，更暖更甜
    const TRACKS = {
      theater: {
        step: 60 / 72 / 2, wet: .32, vel: .5, dur: 1.7,
        melody: [76, 79, 81, 84, 0, 81, 79, 76, 74, 76, 79, 0, 81, 79, 76, 74, 72, 76, 79, 81, 0, 84, 81, 79, 76, 74, 72, 0, 74, 76, 0, 0],
        bass: [60, 57, 65, 67], bassEvery: 8,
        partials: [[1, 1, 1], [2, .32, .45], [3.01, .1, .1]],
      },
      princess: {
        step: 60 / 92 / 2, wet: .42, vel: .44, dur: 2.0, barLen: 6,
        melody: [76, 79, 84, 79, 76, 79, 74, 79, 83, 79, 74, 0, 72, 76, 81, 76, 72, 76, 81, 77, 72, 77, 81, 0,
          76, 79, 84, 79, 76, 79, 74, 79, 83, 79, 74, 0, 72, 76, 81, 76, 72, 76, 77, 79, 84, 0, 0, 0],
        chords: [[60, 67, 64], [55, 62, 59], [57, 64, 60], [53, 60, 57], [60, 67, 64], [55, 62, 59], [57, 64, 60], [53, 60, 57]],
        partials: [[1, 1, 1], [2, .22, .5], [4, .06, .12]],
      },
    };
    const f = m => 440 * Math.pow(2, (m - 69) / 12);
    function ensure() {
      if (ac) return;
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const conv = ac.createConvolver(); const len = ac.sampleRate * 1.8, buf = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      conv.buffer = buf; wet = ac.createGain(); wet.gain.value = .32; master.connect(conv); conv.connect(wet); wet.connect(ac.destination);
    }
    function note(freq, t, vel, dur, partials) {
      for (const [mul, g, dk] of partials) {
        const o = ac.createOscillator(), e = ac.createGain(); const d = Math.max(.12, dur * dk);
        o.type = 'sine'; o.frequency.value = freq * mul;
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * g, t + .005); e.gain.exponentialRampToValueAtTime(.0006, t + d);
        o.connect(e); e.connect(master); o.start(t); o.stop(t + d + .05);
      }
    }
    function tick() {
      const T = TRACKS[track];
      while (next < ac.currentTime + .5) {
        const i = step % T.melody.length, m = T.melody[i];
        if (m) note(f(m + (Math.random() < .08 ? 12 : 0)), next, T.vel + Math.random() * .15, T.dur, T.partials);
        if (T.chords) { // 华尔兹：咚-嚓-嚓
          const bar = (step / T.barLen | 0) % T.chords.length, pos = step % T.barLen, ch = T.chords[bar];
          if (pos === 0) note(f(ch[0]), next, .34, 2.4, T.partials);
          else if (pos === 2 || pos === 4) { note(f(ch[1]), next, .12, .9, T.partials); note(f(ch[2]), next, .1, .9, T.partials); }
        } else if (i % T.bassEvery === 0) {
          note(f(T.bass[(step / T.bassEvery | 0) % T.bass.length]), next, .3, 2.6, T.partials);
        }
        next += T.step; step++;
      }
    }
    return {
      start() {
        ensure(); ac.resume(); on = true; wet.gain.value = TRACKS[track].wet;
        next = Math.max(next, ac.currentTime + .1); master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(.24, ac.currentTime + 1.2);
        clearInterval(timer); timer = setInterval(tick, 120); tick();
      },
      stop() { if (!ac) return; on = false; clearInterval(timer); master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + .6); },
      setTrack(name) {
        if (!TRACKS[name] || name === track) return;
        track = name; step = 0;
        if (on && ac) { // 淡出再从头进新曲
          clearInterval(timer); master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + .5);
          setTimeout(() => { if (on) { next = ac.currentTime + .1; wet.gain.value = TRACKS[track].wet; master.gain.linearRampToValueAtTime(.24, ac.currentTime + 1); timer = setInterval(tick, 120); tick(); } }, 550);
        }
      },
      get on() { return on; },
    };
  })();

  /* ---------- 渲染 ---------- */
  let bgFlip = false, typeTimer = 0;
  function setBg(bg) {
    const layers = [$('#bgA'), $('#bgB')];
    const show = layers[bgFlip ? 1 : 0], hide = layers[bgFlip ? 0 : 1]; bgFlip = !bgFlip;
    show.style.backgroundImage = bg.img ? `url(assets/bg/${bg.img}.jpg)` : 'linear-gradient(160deg,#5a3f4a,#3a2a36)';
    show.classList.add('show'); hide.classList.remove('show');
    $('#stage').style.setProperty('--tone', bg.tone || '#f6b9c9');
    FX.setTheme(bg.fx || 'sparkle');
  }
  function swapLook(id, withFx) {
    const a = $('#lookA'), b = $('#lookB');
    const cur = a.classList.contains('on') ? a : b, nxt = cur === a ? b : a;
    const src = lookSrc(id);
    if (cur.getAttribute('src') === src) return;
    const show = () => {
      nxt.classList.add('on'); cur.classList.remove('on');
      if (withFx && !reduced) {
        const inner = $('#lookInner'); inner.classList.remove('fxing'); void inner.offsetWidth; inner.classList.add('fxing');
        const sw = $('#sweep'); sw.classList.remove('run'); void sw.offsetWidth; sw.classList.add('run');
        const r = $('#lookBox').getBoundingClientRect(), s = $('#stage').getBoundingClientRect();
        FX.burst(r.left - s.left + r.width / 2, r.top - s.top + r.height * .42, 30);
      }
    };
    nxt.onload = show; nxt.onerror = () => { nxt.src = lookSrc('base'); };
    nxt.src = src;
    if (nxt.complete && nxt.naturalWidth) show();
  }
  function fitLook() {
    const st = $('#stage').getBoundingClientRect();
    const h = st.height - 96, w = Math.min(h * 2 / 3, st.width - 40);
    const box = $('#lookBox'); box.style.width = w + 'px'; box.style.height = (w * 1.5) + 'px';
  }
  function typeLine(text) {
    const el = $('#capLine'); clearInterval(typeTimer); el.textContent = ''; el.classList.remove('done');
    if (reduced) { el.textContent = text; el.classList.add('done'); return; }
    let i = 0; typeTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(typeTimer); el.classList.add('done'); } }, 34);
  }
  function caption(o) { $('#capName').innerHTML = `${o.name}<small>${o.en || ''}</small>`; typeLine(o.line); }
  function ring() {
    const n = Math.min(tried.size, total), c = 2 * Math.PI * 19;
    $('#ringFg').style.strokeDashoffset = c * (1 - n / total);
    $('#ringText').textContent = unlocked ? '✓' : `${n}/${total}`;
    $('#ring').classList.toggle('done', unlocked);
    $('#btnLetter').classList.toggle('hidden', !unlocked);
  }
  function render(withFx) {
    const o = byId('outfit', state.outfit), bg = byId('bg', state.bg);
    setBg(bg); swapLook(o.id, withFx); fitLook(); ring();
    store.set('state', state);
  }
  function renderTabs() {
    $('#tabs').innerHTML = KINDS.map(([k, n]) => `<button class="tab ${k === tab ? 'active' : ''}" data-k="${k}">${n}</button>`).join('');
  }
  function renderItems() {
    const el = $('#items');
    if (tab === 'outfit') {
      el.innerHTML = DATA.outfit.map(o => {
        const locked = o.hidden && !unlocked, active = state.outfit === o.id;
        return `<button class="card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" data-id="${o.id}">
          ${o.hidden && unlocked ? '<span class="badge">限定</span>' : ''}
          ${tried.has(o.id) && !locked ? '<span class="tick">✓</span>' : ''}
          <img src="${thumbSrc(o.id)}" alt="" loading="lazy" decoding="async">
          ${locked ? '<svg class="lock"><use href="#i-lock"/></svg>' : ''}
          <span class="nm">${locked ? '？？？' : o.name}</span><span class="en">${locked ? 'LOCKED' : (o.en || '')}</span>
        </button>`;
      }).join('');
    } else {
      el.innerHTML = DATA.bg.map(b => `<button class="scene ${state.bg === b.id ? 'active' : ''}" data-id="${b.id}">
        <i style="background-image:${b.img ? `url(assets/thumb/${b.img}.jpg)` : 'linear-gradient(160deg,#5a3f4a,#3a2a36)'}"></i><span>${b.name}</span></button>`).join('');
    }
    const act = el.querySelector('.active'); if (act) act.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  let toastTimer = 0;
  function toast(text, ms = 3200) {
    const t = $('#toast'); t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ---------- 交互 ---------- */
  function pick(kind, id) {
    const item = byId(kind, id);
    if (kind === 'outfit') {
      if (item.hidden && !unlocked) { toast('试穿完所有衣服，衣柜深处会有东西。'); return; }
      state.bg = (item.set && item.set.bg) || state.bg;
      if (!item.hidden) tried.add(id); store.set('tried', [...tried]);
      state.outfit = id; render(true); caption(item);
    } else {
      state.bg = id; render(false); toast(item.line, 2200);
    }
    renderItems(); checkUnlock();
  }
  function checkUnlock() {
    if (unlocked) return;
    if (visibleOutfits().every(o => tried.has(o.id))) {
      unlocked = true; store.set('unlocked', true);
      confetti(); setTimeout(() => { ring(); renderItems(); openLetter(true); }, 1000);
    }
  }
  function randomize() {
    const r = arr => arr[Math.floor(Math.random() * arr.length)];
    const pool = DATA.outfit.filter(o => (!o.hidden || unlocked) && o.id !== state.outfit);
    const o = r(pool); state.outfit = o.id; state.bg = r(DATA.bg).id;
    if (!o.hidden) tried.add(o.id); store.set('tried', [...tried]);
    render(true); caption(o); renderItems(); checkUnlock();
    toast(r(['衣柜摇了摇，掉出来这套。', '这套……好像也不错？', '换个风格试试。']), 2000);
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti';
    const glyphs = ['✦', '❀', '✿', '♡', '✧', '❁'], colors = ['#f5dcc8', '#f6b9c9', '#e7bfa8', '#fff', '#d7b6e6'];
    for (let i = 0; i < 46; i++) {
      const s = document.createElement('span'); s.textContent = glyphs[i % glyphs.length];
      s.style.left = Math.random() * 100 + '%'; s.style.color = colors[i % colors.length];
      s.style.animationDelay = Math.random() * .9 + 's'; s.style.fontSize = 12 + Math.random() * 16 + 'px';
      box.appendChild(s);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
  }
  function petals(x, y) {
    const stage = $('#stage'), rect = stage.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('span'); p.className = 'petal'; p.textContent = ['✿', '✦', '❀', '♡'][i % 4];
      p.style.left = (x - rect.left + (Math.random() - .5) * 70) + 'px'; p.style.top = (y - rect.top - 10) + 'px';
      p.style.animationDelay = (i * .05) + 's'; p.style.color = ['#f5dcc8', '#f6b9c9', '#fff'][i % 3];
      stage.appendChild(p); setTimeout(() => p.remove(), 1300);
    }
    FX.burst(x - rect.left, y - rect.top, 10);
  }

  /* ---------- 弹层 ---------- */
  function openLetter(first) {
    const L = DATA.letter;
    $('#letterTitle').textContent = first ? '衣柜最深处，还有一件' : L.title;
    $('#letterBody').innerHTML = L.body.map(p => `<p>${p}</p>`).join('') + `<p class="sign">—— ${L.sign}</p>`;
    $('#letterHint').textContent = first ? '生日限定款已经放进衣柜了，去看看。' : '';
    $('#letter').classList.remove('hidden');
  }
  function openCompare() {
    const o = byId('outfit', state.outfit);
    $('#cmpLook').src = lookSrc(o.id); $('#cmpPhoto').src = `assets/photo/${o.photo}.jpg`;
    setCmp(50); $('#compare').classList.remove('hidden');
  }
  function setCmp(pct) {
    pct = Math.max(2, Math.min(98, pct));
    $('#cmpPhoto').style.clipPath = `inset(0 ${100 - pct}% 0 0)`; $('#cmpHandle').style.left = pct + '%';
  }
  function openBook() {
    $('#bookGrid').innerHTML = DATA.outfit.map(o => {
      const locked = o.hidden && !unlocked, done = tried.has(o.id);
      return `<button class="bk ${state.outfit === o.id ? 'active' : ''} ${locked ? 'locked' : (done ? '' : 'todo')}" data-id="${o.id}">
        <img src="${thumbSrc(o.id)}" alt="">${done && !locked ? '<span class="tick">✓</span>' : ''}${locked ? '<svg class="lock"><use href="#i-lock"/></svg>' : ''}
        <span class="nm">${locked ? '？？？' : o.name}</span><span class="en">${locked ? 'LOCKED' : (o.en || '')}</span></button>`;
    }).join('');
    $('#book').classList.remove('hidden');
  }

  /* ---------- 拍照：两种版式 ---------- */
  const FONT_SERIF = '"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC",Georgia,serif';
  const FONT_SANS = '-apple-system,"PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif';
  function spaced(ctx, text, x, y, spacing) { // 手动字距
    let total = 0; for (const ch of text) total += ctx.measureText(ch).width + spacing; total -= spacing;
    let cx = x - total / 2; ctx.textAlign = 'left';
    for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
    ctx.textAlign = 'center';
  }
  async function drawScene(ctx, Wp, Hp, bg, alpha) {
    if (bg.img) {
      try {
        const im = await loadImg(`assets/bg/${bg.img}.jpg`); const s = Math.max(Wp / im.width, Hp / im.height) * 1.25;
        ctx.save(); ctx.globalAlpha = alpha; if ('filter' in ctx) ctx.filter = 'blur(46px) saturate(1.15)';
        ctx.drawImage(im, (Wp - im.width * s) / 2, (Hp - im.height * s) / 2, im.width * s, im.height * s); ctx.restore();
      } catch (e) { }
    }
  }
  async function makePoster() {
    toast('咔嚓，正在冲洗照片……', 1800);
    const o = byId('outfit', state.outfit), bg = byId('bg', state.bg);
    const look = await loadImg(lookSrc(o.id)).catch(() => null);
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const idx = DATA.outfit.findIndex(x => x.id === o.id) + 1;
    if (posterTpl === 'mag') {
      const P = theme === 'princess'
        ? { bg: '#fbeef2', veil0: 'rgba(251,238,242,.2)', veil1: 'rgba(251,238,242,.9)', title: '#d9748f', sub: '#e48aa6', text: '#5b474d', side: 'rgba(91,71,77,.8)', line: 'rgba(217,116,143,.45)', shadow: 'rgba(130,60,90,.3)' }
        : { bg: '#17111a', veil0: 'rgba(23,17,26,.15)', veil1: 'rgba(23,17,26,.85)', title: '#f5dcc8', sub: '#e7bfa8', text: 'rgba(246,238,233,.9)', side: 'rgba(246,238,233,.85)', line: 'rgba(245,220,200,.5)', shadow: 'rgba(0,0,0,.45)' };
      const Wp = 1080, Hp = 1620; cv.width = Wp; cv.height = Hp;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, Wp, Hp);
      await drawScene(ctx, Wp, Hp, bg, .6);
      let g = ctx.createLinearGradient(0, 0, 0, Hp); g.addColorStop(0, P.veil0); g.addColorStop(.6, P.veil0); g.addColorStop(1, P.veil1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wp, Hp);
      // 刊名
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = P.title; ctx.font = `500 200px ${FONT_SERIF}`; spaced(ctx, DATA.name, Wp / 2, 300, 30);
      ctx.fillStyle = P.sub; ctx.font = `500 26px ${FONT_SANS}`; spaced(ctx, 'DRESS-UP ROOM  ·  ÉDITION PRIVÉE', Wp / 2, 352, 6);
      // 人物
      if (look) { const h = 1160, w = h * 2 / 3; ctx.save(); ctx.shadowColor = P.shadow; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26; ctx.drawImage(look, (Wp - w) / 2, 1425 - h, w, h); ctx.restore(); }
      // 侧边竖排
      ctx.save(); ctx.translate(74, 760); ctx.rotate(-Math.PI / 2); ctx.fillStyle = P.side; ctx.font = `500 26px ${FONT_SANS}`; spaced(ctx, `VOL. ${String(idx).padStart(2, '0')}   ${(o.en || '').toUpperCase()}`, 0, 0, 5); ctx.restore();
      ctx.save(); ctx.translate(1016, 760); ctx.rotate(Math.PI / 2); ctx.fillStyle = P.side; ctx.font = `500 26px ${FONT_SANS}`; spaced(ctx, `衣柜试穿  ${Math.min(tried.size, total)} / ${total}`, 0, 0, 6); ctx.restore();
      // 底部文案
      ctx.fillStyle = P.line; ctx.fillRect(90, 1448, Wp - 180, 1);
      ctx.fillStyle = P.title; ctx.font = `500 46px ${FONT_SERIF}`; spaced(ctx, o.name, Wp / 2, 1512, 8);
      ctx.fillStyle = P.text; ctx.font = `400 30px ${FONT_SANS}`; ctx.fillText(o.line, Wp / 2, 1566);
    } else {
      const Wp = 1080, Hp = 1400; cv.width = Wp; cv.height = Hp;
      ctx.fillStyle = '#f7f1ea'; ctx.fillRect(0, 0, Wp, Hp);
      // 纸张细纹
      ctx.save(); ctx.globalAlpha = .06; for (let i = 0; i < 1400; i++) { ctx.fillStyle = Math.random() < .5 ? '#000' : '#fff'; ctx.fillRect(Math.random() * Wp, Math.random() * Hp, 2, 2); } ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(70, 70, 940, 1100); ctx.clip();
      ctx.fillStyle = '#2a1e28'; ctx.fillRect(70, 70, 940, 1100);
      await drawScene(ctx, Wp, Hp, bg, .9);
      const g = ctx.createLinearGradient(0, 70, 0, 1170); g.addColorStop(0, 'rgba(20,12,18,.1)'); g.addColorStop(1, 'rgba(20,12,18,.35)'); ctx.fillStyle = g; ctx.fillRect(70, 70, 940, 1100);
      if (look) { const h = 1040, w = h * 2 / 3; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20; ctx.drawImage(look, (Wp - w) / 2, 1170 - 20 - h, w, h); ctx.restore(); }
      ctx.restore();
      ctx.textAlign = 'center'; ctx.fillStyle = '#4a3a3e'; ctx.font = `500 52px ${FONT_SERIF}`; spaced(ctx, o.name, Wp / 2, 1262, 10);
      ctx.fillStyle = '#8a7a7e'; ctx.font = `400 28px ${FONT_SANS}`; ctx.fillText(o.line, Wp / 2, 1318);
      ctx.fillStyle = '#c99a86'; ctx.font = `400 22px ${FONT_SANS}`; spaced(ctx, `${DATA.name.toUpperCase()}  ·  DRESS-UP ROOM`, Wp / 2, 1362, 5);
    }
    $('#posterImg').src = cv.toDataURL('image/jpeg', .92);
    $('#poster').classList.remove('hidden');
  }

  /* ---------- 皮肤 ---------- */
  function applyTheme(t, announce) {
    theme = t; store.set('theme', t); document.documentElement.dataset.theme = t;
    $('#skinName').textContent = t === 'princess' ? '公主风' : '剧场版';
    $('#skinIcon').setAttribute('href', t === 'princess' ? '#i-crown' : '#i-theater');
    Music.setTrack(t);
    if (announce) {
      toast(t === 'princess' ? '已换上公主风 ♛' : '已换上剧场版 ✦', 2000);
      const r = $('#lookBox').getBoundingClientRect(), s = $('#stage').getBoundingClientRect();
      FX.burst(r.left - s.left + r.width / 2, r.top - s.top + r.height * .4, 34);
      const sw = $('#sweep'); sw.classList.remove('run'); void sw.offsetWidth; sw.classList.add('run');
    }
  }

  /* ---------- 事件 ---------- */
  $('#btnSkin').addEventListener('click', () => applyTheme(theme === 'princess' ? 'theater' : 'princess', true));
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (!b) return; tab = b.dataset.k; renderTabs(); renderItems(); });
  $('#items').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; pick(tab, b.dataset.id); });
  $('#btnRandom').addEventListener('click', randomize);
  $('#btnPhoto').addEventListener('click', makePoster);
  $('#btnCompare').addEventListener('click', openCompare);
  $('#btnBook').addEventListener('click', openBook);
  $('#btnLetter').addEventListener('click', () => openLetter(false));
  $('#btnMusic').addEventListener('click', () => { musicOn = !musicOn; store.set('music', musicOn); musicOn ? Music.start() : Music.stop(); $('#btnMusic').classList.toggle('playing', musicOn); toast(musicOn ? '八音盒 · 开' : '八音盒 · 关', 1400); });
  $('#posterSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; posterTpl = b.dataset.t; document.querySelectorAll('#posterSeg button').forEach(x => x.classList.toggle('active', x === b)); makePoster(); });
  $('#bookGrid').addEventListener('click', e => { const b = e.target.closest('.bk'); if (!b) return; $('#book').classList.add('hidden'); tab = 'outfit'; renderTabs(); pick('outfit', b.dataset.id); });
  document.querySelectorAll('.overlay .close, .overlay .pill').forEach(b => b.addEventListener('click', e => e.target.closest('.overlay').classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o && !o.classList.contains('intro')) o.classList.add('hidden'); }));
  // 对照滑块
  const cmp = $('#cmp'); let cmpDown = false;
  const cmpMove = e => { const r = cmp.getBoundingClientRect(); setCmp((e.clientX - r.left) / r.width * 100); };
  cmp.addEventListener('pointerdown', e => { cmpDown = true; cmp.setPointerCapture(e.pointerId); cmpMove(e); });
  cmp.addEventListener('pointermove', e => { if (cmpDown) cmpMove(e); });
  cmp.addEventListener('pointerup', () => cmpDown = false); cmp.addEventListener('pointercancel', () => cmpDown = false);
  // 舞台：视差 + 点人物撒花
  const stage = $('#stage'); let down = null;
  stage.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; down = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  stage.addEventListener('pointermove', e => {
    if (!down && e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    stage.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3));
    stage.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
  });
  const release = e => {
    stage.style.setProperty('--px', 0); stage.style.setProperty('--py', 0);
    if (down && e.type === 'pointerup' && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && e.target.closest('.avatar-wrap')) {
      petals(e.clientX, e.clientY);
      const inner = $('#lookInner'); inner.classList.remove('bounce'); void inner.offsetWidth; inner.classList.add('bounce');
    }
    down = null;
  };
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release); stage.addEventListener('pointerleave', release);
  addEventListener('resize', () => { fitLook(); FX.resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Music.stop(); else if (musicOn && entered) Music.start(); });
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

  /* ---------- 开场 ---------- */
  let entered = false;
  function greeting() {
    const h = new Date().getHours(), G = DATA.greetings;
    const key = h < 5 ? 'night' : h < 11 ? 'morning' : h < 14 ? 'noon' : h < 18 ? 'afternoon' : h < 23 ? 'evening' : 'night';
    return (G[key] || '').replace('{name}', DATA.name);
  }
  $('#closet').addEventListener('click', () => {
    const c = $('#closet'); if (c.classList.contains('open')) return;
    c.classList.add('open'); $('#introTip').textContent = '';
    if (musicOn) { Music.start(); $('#btnMusic').classList.add('playing'); }
    setTimeout(() => { $('#intro').classList.add('fade'); entered = true; fitLook(); FX.resize(); toast(greeting(), 3600); caption(byId('outfit', state.outfit)); }, 900);
    setTimeout(() => $('#intro').remove(), 1900);
  });
  $('#introName').textContent = DATA.name; $('#topName').textContent = DATA.name;
  $('#btnMusic').classList.toggle('playing', false);

  // 预加载全部立绘，进度显示在开场页底部那根线上
  (function preload() {
    const ids = DATA.outfit.map(o => o.id); let done = 0;
    ids.forEach(id => { const im = new Image(); im.onload = im.onerror = () => { done++; $('#loadBar').style.width = (done / ids.length * 100) + '%'; }; im.src = lookSrc(id); });
  })();

  applyTheme(theme, false);
  renderTabs(); renderItems(); render(false);
  caption(byId('outfit', state.outfit));
})();

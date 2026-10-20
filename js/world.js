// The right pane: the world she runs in. A small interactive canvas TUI engine; scenes live in scenes.js.
// Every scene is draw(g, t, params, dt) where t is seconds since the scene started, plus optional onClick(mx, my, params, g).
const World = (() => {
  const PAL = {
    blue: { bg: '#080e1c', fg: '#c8d3ec', dim: '#4a5a84', faint: '#1b2442', acc: '#7aa2ff', hi: '#d6ecff', amb: '#ffc46b', red: '#ff5468', green: '#5fd38d' },
    red:  { bg: '#12060a', fg: '#f0cdd3', dim: '#80394b', faint: '#33121c', acc: '#ff5a6e', hi: '#ffe0e4', amb: '#ffc46b', red: '#ff3048', green: '#5fd38d' },
    mono: { bg: '#080b13', fg: '#aab3c8', dim: '#3e4659', faint: '#181d2a', acc: '#9aa6c0', hi: '#e6ebf5', amb: '#d9c08a', red: '#c76b77', green: '#8fbf9c' },
  };
  const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace';
  const scenes = {};
  const logs = [];
  let cv, ctx, W = 0, H = 0, dpr = 1, frozen = false;
  let cur = null, curName = '', params = {}, sceneT = 0, lastNow = 0, trans = 0, theme = 'blue', fontKey = '';
  const mouse = { x: -1, y: -1, down: false, hover: false };
  let hitZones = [];
  const bitCache = new Map();

  function setFont(size, bold) {
    const k = (bold ? 'bold ' : '') + size + 'px ' + MONO;
    if (k !== fontKey) { ctx.font = k; fontKey = k; }
  }

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexMix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
    const A = ch(pa), B = ch(pb);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }

  const g = {
    get W() { return W; }, get H() { return H; }, get pal() { return PAL[theme]; },
    get ctx() { return ctx; }, get logs() { return logs; }, get dpr() { return dpr; },
    get mouse() { return mouse; }, MONO,
    mix: hexMix, rng: mulberry,
    hash(a, b = 0, c = 0) {
      let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
      h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    },
    text(x, y, s, col, size = 13, o = {}) {
      setFont(size, o.bold);
      ctx.fillStyle = col || PAL[theme].fg;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = 'top';
      if (o.alpha !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, o.alpha));
      if (o.glow) { ctx.shadowColor = col; ctx.shadowBlur = o.glow; }
      ctx.fillText(s, x, y);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    },
    measure(s, size = 13, bold = false) { setFont(size, bold); return ctx.measureText(s).width; },
    rect(x, y, w, h, col, alpha) {
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
    },
    stroke(x, y, w, h, col, lw = 1) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
    },
    box(x, y, w, h, title, col) {
      g.stroke(x, y, w, h, col || PAL[theme].faint);
      if (title) {
        const tw = g.measure(title, 11);
        g.rect(x + 10, y - 7, tw + 10, 14, PAL[theme].bg);
        g.text(x + 15, y - 6, title, col || PAL[theme].dim, 11);
      }
    },
    // Register an interactive clickable button/region in the current frame
    btn(x, y, w, h, label, o = {}) {
      const P = PAL[theme];
      const disabled = !!o.disabled;
      const isHover = !disabled && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
      if (isHover) mouse.hover = true;
      const borderCol = o.col || (isHover ? P.hi : o.active ? P.acc : P.dim);
      const bgCol = o.bg || (o.active ? P.acc : isHover ? P.faint : P.bg);
      const bgAlpha = o.active ? 0.22 : isHover ? 0.65 : 0.85;
      g.rect(x, y, w, h, bgCol, bgAlpha);
      g.stroke(x, y, w, h, borderCol, isHover || o.active ? 1.5 : 1);
      const textCol = disabled ? P.dim : (o.textCol || (isHover ? P.hi : o.active ? P.acc : P.fg));
      const fontSize = o.size || 12;
      g.text(x + w / 2, y + (h - fontSize) / 2 - 1, label, textCol, fontSize, {
        align: 'center',
        bold: o.bold ?? (isHover || o.active),
        glow: isHover ? 8 : 0,
        alpha: disabled ? 0.45 : 1,
      });
      if (!disabled && o.onClick) {
        hitZones.push({ x, y, w, h, onClick: o.onClick });
      }
      return isHover;
    },
    poly(pts, col, w = 1.5) {
      if (pts.length < 2) return;
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    },
    line(x1, y1, x2, y2, col, w = 1, dash = null) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (dash) ctx.setLineDash([]);
    },
    bits(text, rows) {
      const key = text + '|' + rows;
      if (bitCache.has(key)) return bitCache.get(key);
      const oc = document.createElement('canvas');
      const c = oc.getContext('2d', { willReadFrequently: true });
      const f = `bold ${rows}px ${MONO}`;
      c.font = f;
      const w = Math.ceil(c.measureText(text).width) + 2, h = Math.ceil(rows * 1.15);
      oc.width = w; oc.height = h;
      c.font = f; c.fillStyle = '#fff'; c.textBaseline = 'middle';
      c.fillText(text, 1, h / 2);
      const d = c.getImageData(0, 0, w, h).data;
      const arr = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) arr[i] = d[i * 4 + 3] > 110 ? 1 : 0;
      const out = { w, h, at: (x, y) => arr[y * w + x] };
      bitCache.set(key, out);
      return out;
    },
  };

  function resize() {
    if (frozen || !cv) return;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    fontKey = '';
  }

  function scramble(k) {
    const P = PAL[theme];
    const glyphs = '01#%&@$*+=-:.<>/\\|_~░▒▓';
    const cw = 9, ch = 16;
    for (let y = 0; y < H; y += ch) {
      for (let x = 0; x < W; x += cw) {
        if (Math.random() < k * 0.35) g.text(x, y, glyphs[(Math.random() * glyphs.length) | 0], Math.random() < 0.2 ? P.hi : P.acc, 12, { alpha: k });
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastNow) / 1000 || 0);
    lastNow = now;
    if (frozen || !W || !ctx) return;
    sceneT += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAL[theme].bg;
    ctx.fillRect(0, 0, W, H);
    hitZones = [];
    mouse.hover = false;
    if (cur) {
      try { cur.draw(g, sceneT, params, dt); } catch (e) { console.error(curName, e); }
    }
    if (cv) cv.style.cursor = mouse.hover ? 'pointer' : 'default';
    if (trans > 0) { scramble(trans); trans -= dt / 0.45; }
  }

  function getPos(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function bindEvents(canvas) {
    canvas.addEventListener('pointermove', e => {
      const p = getPos(e);
      mouse.x = p.x; mouse.y = p.y;
      if (cur && cur.onMove) cur.onMove(p.x, p.y, params, g);
    });
    canvas.addEventListener('pointerleave', () => {
      mouse.x = -1; mouse.y = -1; mouse.down = false;
    });
    canvas.addEventListener('pointerdown', e => {
      const p = getPos(e);
      mouse.x = p.x; mouse.y = p.y; mouse.down = true;
      for (let i = hitZones.length - 1; i >= 0; i--) {
        const z = hitZones[i];
        if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
          z.onClick();
          return;
        }
      }
      if (cur && cur.onClick) cur.onClick(p.x, p.y, params, g);
    });
    canvas.addEventListener('pointerup', () => {
      mouse.down = false;
    });
  }

  function setHint(text, kind = '') {
    const el = document.getElementById('world-hint');
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = '';
      el.className = '';
    } else {
      el.hidden = false;
      el.textContent = text;
      el.className = kind ? 'wh-' + kind : '';
    }
  }

  return {
    mount(canvas) {
      cv = canvas; ctx = cv.getContext('2d');
      new ResizeObserver(resize).observe(cv);
      bindEvents(cv);
      resize();
      requestAnimationFrame(frame);
    },
    define(name, def) { scenes[name] = def; },
    set(name, p = {}, { cut = true } = {}) {
      const def = scenes[name];
      if (!def) { console.warn('no scene', name); return; }
      cur = Object.create(def);
      curName = name;
      params = { ...p };
      sceneT = 0;
      setHint('');
      if (cur.init) cur.init(params, g);
      if (cut) { trans = 1; if (typeof Sfx !== 'undefined') Sfx.glitch(); }
      const el = document.getElementById('world-title');
      if (el) el.textContent = def.title || '\\ world';
    },
    param(p) { Object.assign(params, p); },
    get params() { return params; },
    get name() { return curName; },
    setHint,
    log(s) {
      const d = new Date();
      logs.push({ t: d.toTimeString().slice(0, 8), s, at: performance.now() });
      if (logs.length > 60) logs.shift();
    },
    setTheme(name) { theme = PAL[name] ? name : 'blue'; },
    freeze(v) { frozen = v; if (!v) setTimeout(resize, 30); },
  };
})();

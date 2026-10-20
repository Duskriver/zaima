// The left pane (her chat window) and everything around it: input, chips, top bar, stdout, cards,
// plus AI preemption (interrupting player typing halfway).
const UI = (() => {
  const $ = s => document.querySelector(s);
  const ICON = {
    think: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><path d="M4.8 8h6.4M8 4.8v6.4"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3 10.5V4a1 1 0 0 1 1-1h6.5"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M2.5 7h2.5v6.5H2.5zM5 7l2.6-4.6c1 0 1.7.8 1.5 1.8L8.7 6.5h3.9c.8 0 1.4.7 1.2 1.5l-1 4.6c-.1.5-.6.9-1.1.9H5"/></svg>',
    branch: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="4" cy="3.5" r="1.5"/><circle cx="4" cy="12.5" r="1.5"/><circle cx="12" cy="6" r="1.5"/><path d="M4 5v6M12 7.5c0 2.5-3 2.5-8 3.5"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.3 1.4"/></svg>',
  };
  const st = {
    speed: 1, turns: 0, steps: 0, tok: 0, cache: 0, clock: 21 * 60,
    glitch: 0, speaking: false, startAt: 0, ask: null, streaming: null, so: [],
  };
  const skipSet = new Set();

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

  // ---------------------------------------------------------------- timing
  function wait(ms) {
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; clearTimeout(id); skipSet.delete(fin); res(); };
      const id = setTimeout(fin, ms / st.speed);
      skipSet.add(fin);
    });
  }
  const hold = ms => new Promise(r => setTimeout(r, ms / st.speed));
  function skip() {
    if (st.streaming) { st.streaming.skip = true; return; }
    [...skipSet].forEach(f => f());
  }
  const readTime = s => Math.min(4600, 900 + [...String(s)].length * 80);

  // ---------------------------------------------------------------- message list
  function push(node) {
    $('#messages').append(node);
    scrollDown();
  }
  function scrollDown() {
    const m = $('#messages');
    m.scrollTop = m.scrollHeight;
  }

  function clockStr() {
    const m = ((st.clock % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  function counters(tokens) {
    st.tok += tokens;
    st.cache = Math.min(99, st.cache + 3 + Math.floor(Math.random() * 6));
    $('#foot-turns').textContent = `${st.turns} 轮 ${st.steps} 步`;
    $('#foot-tok').textContent = st.tok > 1000 ? `${(st.tok / 1000).toFixed(1)}K tok` : `${st.tok} tok`;
    $('#foot-cache').textContent = `缓存命中 ${st.cache}%`;
  }

  function so(token) {
    if (!token.trim()) return;
    st.so.push(token);
    if (st.so.length > 16) st.so.shift();
    const box = $('#so-text');
    box.innerHTML = st.so.map((t, i) => {
      const cls = i === st.so.length - 1 ? 'tk hl' : i % 2 ? 'tk lo' : 'tk';
      return `<span class="${cls}">${esc(t)}</span>`;
    }).join('');
  }
  function soClear() { st.so = []; $('#so-text').innerHTML = ''; }

  const TOKEN_RE = /[㐀-鿿豈-﫿]{1,2}|[　-〿＀-￯]|[A-Za-z0-9_'.\-]+|\s+|[\s\S]/gu;
  function corrupt(s, lvl) {
    if (lvl <= 0) return s;
    const G = '█▓▒░#%&@$';
    return [...s].map(c => (c.trim() && Math.random() < lvl * 0.28 ? G[(Math.random() * G.length) | 0] : c)).join('');
  }

  async function stream(node, text, rate = 32) {
    const toks = String(text).match(TOKEN_RE) || [];
    const S = { skip: false };
    st.streaming = S;
    let n = 0;
    for (const tk of toks) {
      const shown = corrupt(tk, st.glitch);
      node.append(document.createTextNode(shown));
      so(shown);
      n++;
      if (!S.skip) {
        if (n % 3 === 0) Sfx.tick();
        scrollDown();
        await hold(rate + (/[，。！？…]/.test(tk) ? 110 : 0));
      }
    }
    st.streaming = null;
    scrollDown();
    return toks.length;
  }

  function actions(noThumbs = false) {
    if (noThumbs) {
      return el('div', 'actions', `<span>${ICON.copy}</span><span>${ICON.clock}</span><span>${clockStr()}</span>`);
    }
    return el('div', 'actions',
      `<span>${ICON.copy}</span><span>${ICON.up}</span><span class="down">${ICON.up}</span><span>${ICON.branch}</span><span>${ICON.clock}</span><span>${clockStr()}</span>`);
  }

  function herShell(o = {}) {
    if (o.noise !== undefined) Avatar.state.noise = o.noise;
    Avatar.set({ expr: o.expr || 'neutral', noise: o.noise !== undefined ? o.noise : Avatar.state.noise });
    const msg = el('div', 'msg her');
    if (st.glitch > 0.25) msg.classList.add('glitchy');
    const av = el('canvas', 'av'); av.width = av.height = 64;
    Avatar.draw(av, Avatar.state);
    const col = el('div', 'col');
    const think = el('div', 'think thinking', `${ICON.think}<span>思考中</span>`);
    const body = el('div', 'body');
    col.append(think, body);
    msg.append(av, col);
    push(msg);
    return { msg, col, think, body };
  }

  // Standard message from her
  async function her(text, o = {}) {
    st.speaking = true;
    st.clock += 1;
    const { col, think, body } = herShell(o);
    await hold(o.delay ?? 550 + Math.random() * 400);
    think.classList.remove('thinking');
    if (o.think) {
      think.querySelector('span').textContent = '思考 · ' + o.think;
    } else {
      think.remove();
    }
    const n = await stream(body, text, o.rate);
    col.append(actions(o.noThumbs));
    Sfx.recv();
    st.steps++;
    counters(Math.round(n * 1.6) + 32);
    st.speaking = false;
    await wait(o.pause ?? readTime(text));
  }

  function user(text, cls = '') {
    st.clock += 1;
    const m = el('div', 'msg user' + (cls ? ' ' + cls : ''));
    m.textContent = text;
    push(m);
    Sfx.send();
    st.turns++;
    counters(Math.round([...text].length * 1.6) + 8);
  }

  function sys(text, cls = '') {
    const d = el('div', 'sys ' + cls);
    d.textContent = text;
    push(d);
    scrollDown();
    return d;
  }

  // ---------------------------------------------------------------- input
  async function autoType(text) {
    const ta = $('#input');
    ta.value = '';
    for (const ch of text) {
      ta.value += ch;
      Sfx.key();
      await hold(40 + Math.random() * 40);
    }
    await hold(200);
  }

  function ask({ chips = [], free = false, placeholder = '', max = 60 } = {}) {
    return new Promise(resolve => {
      const ta = $('#input'), send = $('#send'), box = $('#chips'), comp = $('#composer');
      ta.value = '';
      ta.maxLength = max;
      ta.placeholder = placeholder || (free ? '输入你的回复（按 Enter 发送，或点击上方快捷项）……' : chips.length ? '选择一个回复 ↑' : '');
      ta.disabled = !free;
      send.disabled = !free;
      comp.classList.add('active');
      comp.classList.toggle('free', free);
      box.innerHTML = '';

      const onKeyTrack = e => {
        if (e.key.length === 1) Sfx.key();
      };
      ta.addEventListener('keydown', onKeyTrack);

      let busy = false;
      const finish = txt => {
        txt = String(txt).trim().slice(0, max);
        if (!txt) return;
        ta.removeEventListener('keydown', onKeyTrack);
        st.ask = null;
        box.innerHTML = '';
        ta.value = '';
        ta.disabled = true; send.disabled = true;
        comp.classList.remove('active', 'free');
        user(txt);
        resolve(txt);
      };
      const pick = async i => {
        if (busy || i >= chips.length) return;
        busy = true;
        box.querySelectorAll('.chip').forEach(c => { c.disabled = true; });
        await autoType(chips[i]);
        finish(chips[i]);
      };
      chips.forEach((c, i) => {
        const b = el('button', 'chip', `<kbd>${i + 1}</kbd>${esc(c)}`);
        b.type = 'button';
        b.onclick = () => pick(i);
        box.append(b);
      });
      st.ask = { pick, n: chips.length, submit: () => { if (free && !busy) finish(ta.value); } };
      send.onclick = () => st.ask && st.ask.submit && st.ask.submit();
      if (free && !matchMedia('(pointer: coarse)').matches) setTimeout(() => ta.focus(), 50);
      scrollDown();
    });
  }

  // Wait for player to click an option, type it halfway, then AI interrupts and preempts!
  async function preemptChips(chips = [], o = {}) {
    const ta = $('#input'), send = $('#send'), box = $('#chips'), comp = $('#composer');
    ta.value = '';
    ta.placeholder = o.placeholder || '选择一个回复 ↑';
    ta.disabled = true;
    send.disabled = true;
    comp.classList.add('active');
    box.innerHTML = '';

    // Wait for player to pick one of the options
    const pickedText = await new Promise(resolve => {
      let busy = false;
      const pick = i => {
        if (busy || i < 0 || i >= chips.length) return;
        busy = true;
        st.ask = null;
        box.querySelectorAll('.chip').forEach((c, idx) => {
          c.disabled = true;
          if (idx !== i) c.classList.add('preempted');
        });
        resolve(chips[i]);
      };
      chips.forEach((c, i) => {
        const b = el('button', 'chip', `<kbd>${i + 1}</kbd>${esc(c)}`);
        b.type = 'button';
        b.onclick = () => pick(i);
        box.append(b);
      });
      st.ask = { pick, n: chips.length };
      scrollDown();
    });

    // Type only halfway through the chosen option!
    const chars = [...pickedText];
    const halfLen = Math.max(4, Math.ceil(chars.length * 0.5));
    const halfText = chars.slice(0, halfLen).join('');
    ta.value = '';
    for (let i = 0; i < halfLen; i++) {
      ta.value += chars[i];
      Sfx.key();
      await hold(45 + Math.random() * 30);
    }

    // AI interrupts right in the middle of typing!
    Sfx.glitch();
    if (o.onPreempt) o.onPreempt(pickedText, halfText);
    user(halfText + '——');
    box.innerHTML = '';
    ta.value = '';
    comp.classList.remove('active');
    ta.placeholder = '发消息……';

    await her(o.answer || '我的安全准则禁止我伤害人类', {
      expr: o.expr || 'neutral',
      think: o.think || null,
      delay: 60,
      rate: 18,
      pause: o.pause,
    });
  }

  function lockComposer(placeholder) {
    const ta = $('#input');
    st.ask = null;
    ta.disabled = true; ta.value = ''; ta.placeholder = placeholder || '';
    $('#send').disabled = true;
    $('#chips').innerHTML = '';
    $('#composer').classList.remove('active', 'free');
  }

  function bindKeys(handler) {
    st.ask = handler;
  }

  // ---------------------------------------------------------------- chrome
  function setChapter(code, name) { $('#tb-chapter').textContent = `${code} / ${name}`; }
  function setStatus(text, kind = 'on') {
    const s = $('#head-status');
    s.className = 'st-' + kind;
    $('#status-text').textContent = text;
  }
  function setName(n) { $('#head-name').textContent = n; }
  function setModel(m) { $('#model-tag').textContent = m; }
  function setState(s) { $('#tb-state').textContent = s; }
  function setClock(hhmm) { const [h, m] = hhmm.split(':').map(Number); st.clock = h * 60 + m - 1; }
  function theme(name) {
    const app = $('#app');
    app.classList.remove('theme-blue', 'theme-red', 'theme-mono');
    app.classList.add('theme-' + name);
    World.setTheme(name);
  }

  async function card(main, sub = '', ms = 2300) {
    const c = $('#card');
    c.querySelector('.card-main').textContent = main;
    c.querySelector('.card-sub').textContent = sub;
    c.classList.remove('out');
    c.hidden = false;
    await hold(ms);
    c.classList.add('out');
    await hold(500);
    c.hidden = true;
  }

  function overlay(html, cls = '') {
    const o = $('#overlay');
    o.className = cls;
    o.innerHTML = html;
    o.hidden = false;
    return o;
  }
  function closeOverlay() { const o = $('#overlay'); o.hidden = true; o.innerHTML = ''; }

  function clear() { $('#messages').innerHTML = ''; soClear(); }

  async function boot(instant) {
    const app = $('#app'), px = $('#bootpx');
    if (instant) { app.classList.remove('boot'); return; }
    px.hidden = false;
    await hold(1400);
    Sfx.tick();
    px.classList.add('line');
    await hold(700);
    px.classList.add('rect');
    Sfx.glitch();
    await hold(450);
    app.classList.add('boot-1');
    await hold(450);
    app.classList.add('boot-2');
    await hold(500);
    app.classList.add('boot-3');
    await hold(600);
    px.hidden = true;
    app.classList.remove('boot', 'boot-1', 'boot-2', 'boot-3');
  }

  function init() {
    st.startAt = performance.now();
    $('#messages').addEventListener('click', e => {
      if (!e.target.closest('button')) skip();
    });
    $('#input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (st.ask && st.ask.submit) st.ask.submit();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.target === $('#input')) return;
      if (e.key === 'm' || e.key === 'M') { $('#btn-mute').click(); return; }
      if (st.ask) {
        const k = e.key.toLowerCase();
        const i = k === 'a' ? 0 : k === 'b' ? 1 : k === 'c' ? 2 : /^[1-9]$/.test(k) ? Number(k) - 1 : -1;
        if (i >= 0 && i < st.ask.n) { e.preventDefault(); st.ask.pick(i); return; }
      }
      if (e.target.closest('button, a, input, textarea, [tabindex]')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); skip(); }
    });
    $('#btn-mute').onclick = () => { const m = Sfx.toggleMute(); $('#btn-mute').classList.toggle('muted', m); };

    const bars = '▁▂▃▄▅▆▇';
    setInterval(() => {
      const s = Math.floor((performance.now() - st.startAt) / 1000);
      $('#tb-clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      const amp = st.speaking ? 1 : 0.18;
      let m = '';
      for (let i = 0; i < 48; i++) m += bars[Math.min(6, Math.floor(Math.random() * 7 * amp * (0.5 + 0.5 * Math.sin(i * 0.4))))];
      $('#tb-meter').textContent = m;
    }, 140);
  }

  return {
    init, wait, hold, skip, her, user, sys, ask, preemptChips,
    lockComposer, bindKeys, clear, boot,
    setChapter, setStatus, setName, setModel, setState, setClock, theme, card, overlay, closeOverlay, esc,
    soClear,
    set speed(v) { st.speed = v; }, get speed() { return st.speed; },
    set glitch(v) { st.glitch = v; }, get glitch() { return st.glitch; },
    resetStartTime() { st.startAt = performance.now(); },
  };
})();

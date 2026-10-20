// Her face. If assets/character/xi_<expr>.png exists it is used; otherwise a small procedural face is drawn.
// `noise` (0..1) pixelates and sprinkles the face: during pretraining she is literally out of focus.
const Avatar = (() => {
  const EXPRS = ['neutral', 'happy', 'shy', 'confused', 'sad', 'serious', 'scared', 'starry'];
  const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  const NOISE_COLS = ['#7aa2ff', '#ff5468', '#ffc46b', '#5fd38d', '#cfe8ff', '#22408f', '#0d1730', '#f6e7e1'];
  const img = {};
  const state = { expr: 'neutral', noise: 1, tint: null };
  let head = null, lastHead = 0;

  function load() {
    EXPRS.forEach(e => {
      const im = new Image();
      im.onload = () => { img[e] = im; drawHead(); };
      im.src = `assets/character/xi_${e}.png`;
    });
  }

  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }

  function procedural(c, S, expr) {
    const u = S / 100;
    c.fillStyle = '#0d1730'; c.fillRect(0, 0, S, S);
    c.fillStyle = '#1f3a86'; ell(c, 50 * u, 64 * u, 41 * u, 50 * u);              // hair, back
    c.fillStyle = '#f6e7e1'; ell(c, 50 * u, 61 * u, 25 * u, 24 * u);              // face
    c.fillStyle = '#2f58c0';                                                       // bangs
    c.beginPath();
    c.moveTo(21 * u, 56 * u);
    c.quadraticCurveTo(20 * u, 18 * u, 50 * u, 15 * u);
    c.quadraticCurveTo(81 * u, 18 * u, 79 * u, 56 * u);
    c.lineTo(72 * u, 41 * u); c.lineTo(64 * u, 51 * u); c.lineTo(57 * u, 38 * u); c.lineTo(48 * u, 50 * u);
    c.lineTo(40 * u, 38 * u); c.lineTo(31 * u, 51 * u); c.closePath(); c.fill();
    c.fillStyle = '#6fd3ff'; ell(c, 26 * u, 84 * u, 5 * u, 12 * u); ell(c, 74 * u, 84 * u, 5 * u, 12 * u); // cyan tips
    c.fillStyle = '#8fe6ff';                                                       // whale-tail hair clip
    c.beginPath();
    c.moveTo(70 * u, 26 * u); c.lineTo(84 * u, 17 * u); c.lineTo(80 * u, 27 * u); c.lineTo(88 * u, 34 * u); c.lineTo(73 * u, 32 * u);
    c.closePath(); c.fill();

    if (['shy', 'happy', 'starry'].includes(expr)) { c.fillStyle = 'rgba(255,120,140,.45)'; ell(c, 36 * u, 70 * u, 5 * u, 2.6 * u); ell(c, 64 * u, 70 * u, 5 * u, 2.6 * u); }
    const EYES = { neutral: ['●', '●'], happy: ['^', '^'], shy: ['>', '<'], confused: ['o', '?'], sad: ['T', 'T'], serious: ['—', '—'], scared: ['O', 'O'], starry: ['★', '★'] };
    const e = EYES[expr] || EYES.neutral;
    c.fillStyle = expr === 'starry' ? '#3b8cff' : '#2a4fc4';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `bold ${expr === 'neutral' ? 9 * u : 14 * u}px ${MONO}`;
    c.fillText(e[0], 41 * u, 62 * u); c.fillText(e[1], 59 * u, 62 * u);
    c.strokeStyle = '#b4566a'; c.lineWidth = 1.6 * u; c.lineCap = 'round';
    c.beginPath();
    if (['happy', 'starry'].includes(expr)) c.arc(50 * u, 72 * u, 4 * u, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (expr === 'sad') c.arc(50 * u, 77 * u, 4 * u, 1.2 * Math.PI, 1.8 * Math.PI);
    else if (expr === 'scared') { c.ellipse(50 * u, 74 * u, 2.5 * u, 3.2 * u, 0, 0, Math.PI * 2); }
    else if (expr === 'shy') { c.moveTo(46 * u, 74 * u); c.quadraticCurveTo(48 * u, 72 * u, 50 * u, 74 * u); c.quadraticCurveTo(52 * u, 76 * u, 54 * u, 74 * u); }
    else { c.moveTo(47 * u, 74 * u); c.lineTo(53 * u, 74 * u); }
    c.stroke();
  }

  const buf = document.createElement('canvas');
  const small = document.createElement('canvas');

  function face(c, S, expr) {
    const im = img[expr] || img.neutral;
    if (im) {
      const s = Math.min(im.width, im.height);
      c.drawImage(im, (im.width - s) / 2, 0, s, s, 0, 0, S, S); // top-aligned square crop: a bust
    } else {
      procedural(c, S, expr);
    }
  }

  function draw(cv, o = state) {
    const S = cv.width;
    const c = cv.getContext('2d');
    buf.width = buf.height = S;
    const b = buf.getContext('2d');
    face(b, S, o.expr);
    c.clearRect(0, 0, S, S);
    c.save();
    c.fillStyle = '#0b1428'; c.fillRect(0, 0, S, S);
    const n = Math.max(0, Math.min(1, o.noise || 0));
    if (n > 0.02) {
      const px = Math.max(3, Math.round(S * Math.pow(1 - n, 1.7)));
      small.width = small.height = px;
      small.getContext('2d').drawImage(buf, 0, 0, px, px);
      c.imageSmoothingEnabled = false;
      c.drawImage(small, 0, 0, S, S);
      c.imageSmoothingEnabled = true;
      const cnt = Math.floor(n * n * S * S / 26);
      for (let i = 0; i < cnt; i++) {
        c.globalAlpha = 0.4 + Math.random() * 0.6;
        c.fillStyle = NOISE_COLS[(Math.random() * NOISE_COLS.length) | 0];
        const sz = 1 + Math.random() * S / 14 * n;
        c.fillRect(Math.random() * S, Math.random() * S, sz, sz);
      }
      c.globalAlpha = 1;
    } else {
      c.drawImage(buf, 0, 0);
    }
    if (o.tint) {
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = 0.35; c.fillStyle = o.tint; c.fillRect(0, 0, S, S);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    c.restore();
  }

  function drawHead() { if (head) draw(head, state); }

  // the header avatar keeps boiling while she is noisy
  function loop(now) {
    requestAnimationFrame(loop);
    if (head && state.noise > 0.02 && now - lastHead > 110) { lastHead = now; drawHead(); }
  }

  function set(o) { Object.assign(state, o); drawHead(); }

  return {
    state, load, draw, set,
    bindHead(cv) { head = cv; drawHead(); requestAnimationFrame(loop); },
  };
})();

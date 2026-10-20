// All sound is synthesized with WebAudio. No audio files, no music: the room tone is two oscillators.
const Sfx = (() => {
  let ctx = null, master = null, muted = false, drone = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
  }

  function tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.1, slide = null, delay = 0, attack = 0.005 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  let noiseBuf = null;
  function noise({ dur = 0.03, vol = 0.05, hp = 2000, lp = 12000, delay = 0 }) {
    if (!ctx) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
    const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(h).connect(l).connect(gn).connect(master);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  }

  function setDrone(on, mood = 'calm') {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (drone) {
      const old = drone; drone = null;
      old.gain.gain.setTargetAtTime(0.0001, now, 0.8);
      setTimeout(() => old.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 4000);
    }
    if (!on) return;
    const gain = ctx.createGain(); gain.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = mood === 'red' ? 520 : 340; lp.Q.value = 2;
    const freqs = mood === 'red' ? [55, 58.3, 82.4] : mood === 'deep' ? [41.2, 61.7] : [55, 82.4, 110.2];
    const nodes = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'sine';
      o.frequency.value = f; o.detune.value = (i - 1) * 6;
      o.connect(lp); o.start();
      return o;
    });
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07; lfoGain.gain.value = mood === 'red' ? 260 : 120;
    lfo.connect(lfoGain).connect(lp.frequency); lfo.start();
    nodes.push(lfo);
    lp.connect(gain).connect(master);
    gain.gain.setTargetAtTime(mood === 'red' ? 0.06 : 0.035, now, 2.5);
    drone = { gain, nodes };
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05);
    return muted;
  }

  return {
    init, toggleMute, drone: setDrone,
    key() { noise({ dur: 0.02, vol: 0.05, hp: 2500 + Math.random() * 2500 }); },
    send() { tone({ freq: 520, slide: 820, dur: 0.1, vol: 0.05 }); },
    recv() { tone({ freq: 880, dur: 0.14, vol: 0.035 }); tone({ freq: 1320, dur: 0.22, vol: 0.022, delay: 0.07 }); },
    tick() { tone({ freq: 1800, type: 'square', dur: 0.018, vol: 0.008 }); },
    file() { tone({ freq: 660, dur: 0.08, vol: 0.03 }); tone({ freq: 990, dur: 0.1, vol: 0.025, delay: 0.08 }); },
    error() { tone({ freq: 140, type: 'square', dur: 0.22, vol: 0.04 }); tone({ freq: 110, type: 'square', dur: 0.3, vol: 0.04, delay: 0.18 }); },
    glitch() { noise({ dur: 0.12, vol: 0.05, hp: 400, lp: 6000 }); },
    choose() { tone({ freq: 740, dur: 0.12, vol: 0.04 }); tone({ freq: 1110, dur: 0.16, vol: 0.03, delay: 0.05 }); },
    boom() { tone({ freq: 70, slide: 28, dur: 1.6, vol: 0.3, attack: 0.01 }); noise({ dur: 0.5, vol: 0.12, hp: 60, lp: 900 }); },
    chime() { [1, 2.76, 5.4, 8.9].forEach((m, i) => tone({ freq: 523 * m, dur: 3.2 / (i + 1), vol: 0.06 / (i + 1), attack: 0.004 })); },
  };
})();

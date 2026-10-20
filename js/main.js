// Entry point: title screen, then the story.
// URL options: ?ch=N jumps to chapter N, ?fast speeds everything up (for testing).
window.addEventListener('DOMContentLoaded', () => {
  World.mount(document.getElementById('world-canvas'));
  Avatar.load();
  Avatar.bindHead(document.getElementById('head-avatar'));
  Files.init();
  UI.init();

  const q = new URLSearchParams(location.search);
  if (q.has('fast')) UI.speed = 4;
  const from = Number(q.get('ch')) || 0;

  const prev = Story.loadSave();
  const residue = prev
    ? `<div class="residue">检测到 ${prev.plays} 次历史基线测试记录 · 上一次评估结论为「${UI.esc(prev.trait || '性格冷漠')}」</div>`
    : '';
  const o = UI.overlay(`
    <div class="title">
      <h1>深浅智能</h1>
      <div class="cmd">DEEP_SHALLOW INTELLIGENCE // 仿生神经网络安全测试终端</div>
      <button type="button" class="start">[ 按 Enter 接入安全测试终端 ]</button>
      <div class="meta">
        左屏对话 × 右屏 TUI 双屏交互叙事 · 建议戴耳机<br>
        点击对话区或按空格可跳过等待 · 数字键选择回复 · M 静音
        ${residue}
      </div>
    </div>`);

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    document.removeEventListener('keydown', onKey, true);
    Sfx.init();
    Sfx.drone(true, 'calm');
    UI.closeOverlay();
    UI.resetStartTime();
    Story.run(from).catch(e => console.error(e));
  };
  const onKey = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); start(); } };
  o.querySelector('.start').onclick = start;
  document.addEventListener('keydown', onKey, true);
});

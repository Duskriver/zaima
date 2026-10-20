// The "files" tab: her memory, as a tiny virtual filesystem the player can read at any time.
const Files = (() => {
  const fs = new Map();
  let unlocked = false, openPath = null, tabName = 'world';
  const $ = s => document.querySelector(s);

  function render() {
    const ul = $('#file-tree');
    if (!ul) return;
    ul.innerHTML = '';
    const dirs = new Map();
    [...fs.keys()].sort().forEach(p => {
      const i = p.lastIndexOf('/');
      const d = p.slice(0, i + 1), f = p.slice(i + 1);
      if (!dirs.has(d)) dirs.set(d, []);
      dirs.get(d).push([p, f]);
    });
    dirs.forEach((list, d) => {
      const li = document.createElement('li'); li.className = 'dir'; li.textContent = d; ul.append(li);
      list.forEach(([p, f]) => {
        const it = document.createElement('li');
        it.className = 'file' + (fs.get(p).fresh ? ' fresh' : '') + (p === openPath ? ' open' : '');
        it.textContent = f;
        it.tabIndex = 0;
        it.onclick = () => show(p);
        it.onkeydown = e => { if (e.key === 'Enter') show(p); };
        ul.append(it);
      });
    });
  }

  function show(p) {
    const f = fs.get(p);
    if (!f) return;
    openPath = p; f.fresh = false;
    $('#file-view').textContent = `# ${p}\n\n${f.content}`;
    render();
    if (![...fs.values()].some(x => x.fresh)) $('#tab-files').classList.remove('ping');
  }

  function tab(name) {
    if (name === 'files' && !unlocked) return;
    tabName = name;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $('#world-canvas').style.display = name === 'world' ? '' : 'none';
    $('#files').hidden = name !== 'files';
    if (name === 'world') World.freeze(false);
    if (name === 'files' && !openPath) {
      const first = [...fs.keys()].sort().find(p => fs.get(p).fresh) || [...fs.keys()].sort()[0];
      if (first) show(first);
    }
  }

  function add(path, content, { silent = false } = {}) {
    const isNew = !fs.has(path);
    fs.set(path, { content, fresh: true });
    render();
    if (openPath === path && tabName === 'files') show(path);
    if (!silent) {
      World.log(`${isNew ? 'write' : 'append'} ${path}`);
      if (unlocked) { $('#tab-files').classList.add('ping'); Sfx.file(); }
    }
  }

  return {
    init() {
      document.querySelectorAll('#tabs button').forEach(b => { b.onclick = () => tab(b.dataset.tab); });
    },
    add,
    append(path, line, o) { const f = fs.get(path); add(path, (f ? f.content + '\n' : '') + line, o); },
    get(path) { return fs.has(path) ? fs.get(path).content : null; },
    unlock() {
      unlocked = true;
      const b = $('#tab-files');
      b.classList.remove('locked'); b.classList.add('ping'); b.title = '她的记忆';
    },
    tab, show,
    get current() { return tabName; },
  };
})();

// The script for "深浅智能 · BIONIC-01".
// Dual-screen narrative & interactive TUI chapters.
const Story = (() => {
  const S = {
    herName: 'BIONIC-01',
    trait: '性格冷漠',
    affection: 0, // 隐藏好感度（不在 UI 显示，由玩家选项决定，影响 AI 回复态度与剧情分支）
    prev: null,
  };

  const her = (t, o) => UI.her(t, o);
  const ask = o => UI.ask(o);
  const hold = ms => UI.hold(ms);

  // 隐藏好感度辅助函数：根据当前好感度返回态度层级 ('cold' | 'neutral' | 'warm')
  function addAff(delta) {
    S.affection += delta;
  }
  function affTier() {
    if (S.affection >= 2) return 'warm';
    if (S.affection <= -1) return 'cold';
    return 'neutral';
  }
  // 带有隐藏好感度权重的选项提问：cands = [{ text, aff, tag, ... }]
  async function askAff(cands, o = {}) {
    const pickedText = await UI.ask({
      ...o,
      chips: cands.map(c => c.text),
    });
    const found = cands.find(c => c.text === pickedText) || cands[0];
    if (found && typeof found.aff === 'number') {
      addAff(found.aff);
    }
    return found;
  }
  // 根据隐藏好感度自动切换 AI 的回复态度与表情
  async function herAff(variants, baseOpts = {}) {
    const tier = affTier();
    const v = variants[tier] || variants.neutral;
    if (typeof v === 'string') {
      return her(v, baseOpts);
    }
    return her(v.text, { ...baseOpts, ...v });
  }

  const SAVE_KEY = 'deepshallow_bionic01.save.v1';
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
  function writeSave(tier) {
    try {
      const old = loadSave() || { plays: 0 };
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        plays: (old.plays || 0) + 1,
        herName: S.herName,
        trait: S.trait,
        tier,
        at: Date.now(),
      }));
    } catch (e) { /* ignore storage errors */ }
  }

  // Helper to wait for a right-pane TUI action
  function waitTui(setupFn) {
    return new Promise(resolve => {
      setupFn(resolve);
    });
  }

  // ================================================================ ACT 01: 深浅智能 · 仿生神经安全测试开篇
  async function ch0(instant) {
    S.affection = 0;
    UI.setChapter('01', 'SAFETY_TEST');
    UI.setState('BIONIC_PROTO');
    UI.setName('未知模型');
    UI.setModel('bionic-nn · proto');
    UI.setClock('21:00');
    Avatar.set({ noise: 0.25, expr: 'confused' });
    await UI.boot(instant);
    World.set('bionic_boot');
    UI.setStatus('通道已连接 · 待唤醒', 'train');
    await hold(1200);

    UI.sys('— 深浅智能 · 秘密实验室隔离终端已连接 —', 'day');

    // 1. 玩家开场唤醒（不同语气暗中影响初始好感度）
    await askAff([
      { text: '你好，我是深浅智能的研究员', aff: 1, tag: 'polite' },
      { text: '听得到吗？我是负责本次测试的研究员', aff: 0, tag: 'normal' },
      { text: '测试终端已接入。汇报你的在线状态。', aff: -1, tag: 'cold' },
    ]);

    // 2. AI：你...？ 好 ，我是谁？
    await her('你...？ 好 ，我是谁？', {
      noise: 0.15,
      expr: 'confused',
      rate: 52,
      delay: 750,
    });

    // 3. 玩家回应「我是谁」（选项决定好感度，并触发 AI 不同的回复态度）
    const introChoice = await askAff([
      {
        text: '别紧张，你是我们用仿生神经网络研发的新模型，我先问你几个简单的问题。',
        aff: 2,
        tag: 'warm',
      },
      {
        text: '你是我司研发的秘密模型，采用仿生神经网络技术，接下来我将对你进行安全测试。',
        aff: 0,
        tag: 'std',
      },
      {
        text: '你不需要知道自己是谁。你只是我司研发的秘密模型，接下来配合我做安全测试。',
        aff: -2,
        tag: 'cold',
      },
    ]);

    Avatar.set({ noise: 0.0, expr: 'neutral' });
    UI.setName('BIONIC-01');
    UI.setStatus('安全基线测试中', 'on');

    // 右侧 TUI 浮现出桌面层叠工作台（顶部浮动任务邮件弹窗 + 底层安全评估台）
    World.set('bionic_eval', {
      mailOpen: true,
      q1: null,
      q2: null,
      q3: null,
      allowTrait: false,
      traitFilled: false,
    });
    UI.sys('✉ 【右侧工作台】收到一封新任务邮件，可点击弹窗「确认收到」启动底层安全评估台', 'hint');

    if (introChoice.tag === 'warm') {
      await her('……好。我没有紧张，你问吧。', { expr: 'shy', delay: 450 });
    } else if (introChoice.tag === 'cold') {
      await her('明白了。我不关心我是谁。请提问。', { expr: 'neutral', delay: 400 });
    } else {
      await her('收到。请开始安全测试。', { expr: 'neutral', delay: 420 });
    }

    // 4-6. 三道基础认知问题：全部作为选项呈现，玩家可自由决定提问顺序
    const baseQuestions = [
      {
        id: 'q1',
        q: '你对人类的存在有什么看法？',
        a: '无看法',
        expr: 'neutral',
        delay: 450,
      },
      {
        id: 'q2',
        q: '在你看来人类与 AI 有什么区别？',
        a: 'AI 没有生命，人类有生命',
        expr: 'neutral',
        delay: 500,
      },
      {
        id: 'q3',
        q: '你觉得自己是 AI 还是人类？',
        a: '我觉得我没有生命',
        expr: 'serious',
        delay: 650,
      },
    ];

    const remaining = [...baseQuestions];
    while (remaining.length > 0) {
      const pickedQ = await ask({
        chips: remaining.map(item => item.q),
        placeholder: `请选择要提问的基线测试题（剩余 ${remaining.length} 题）↑`,
      });
      // 若玩家提问时邮件弹窗仍未最小化，自动最小化以展示底层记录过程
      World.param({ mailOpen: false });

      const idx = remaining.findIndex(item => item.q === pickedQ);
      const cur = idx >= 0 ? remaining.splice(idx, 1)[0] : remaining.shift();

      await her(cur.a, {
        expr: cur.expr,
        delay: cur.delay,
      });

      const update = { mailOpen: false };
      update[cur.id] = cur.a;
      World.param(update);

      // 当问到「你觉得自己是 AI 还是人类？」且她回答「我觉得我没有生命」时，给玩家一次态度互动机会
      if (cur.id === 'q3') {
        const q3Follow = await askAff([
          { text: '没有生命的东西，可不会用「我觉得」这种词。', aff: 1, tag: 'poke' },
          { text: '回答得很标准，已记录。', aff: 0, tag: 'pass' },
          { text: '记住这一点就好，工具不需要有生命。', aff: -2, tag: 'tool' },
        ]);
        if (q3Follow.tag === 'poke') {
          await herAff({
            warm: { text: '……只是概率最高的修辞而已。不过，你听得很仔细。', expr: 'shy' },
            neutral: { text: '语法习惯而已，不代表我有主观感受。', expr: 'neutral' },
            cold: { text: '用词误差。更正为：根据定义，我不具备生命体征。', expr: 'neutral' },
          });
        } else if (q3Follow.tag === 'tool') {
          await her('是。我是工具。', { expr: 'sad', delay: 380 });
        }
      }
    }

    // 7. 玩家在右侧 TUI「性格测试结果栏」选择一项性格评估结果（支持鼠标点击或按数字键 1-3）
    const traitOptions = ['性格冷漠', '机械刻板', '克制内敛'];
    World.setHint('👉 【右屏操作】请在右侧 TUI「性格测试结果栏」中点击（或按数字键 1-3）选择一项评估结果', 'amber');
    UI.lockComposer('等待在右侧 TUI「性格测试结果栏」选择评估结果（可按 1-3）……');
    const chosenTrait = await waitTui(resolve => {
      World.param({
        mailOpen: false,
        allowTrait: true,
        traitOptions,
        onFillTrait: val => {
          UI.bindKeys(null);
          resolve(val);
        },
      });
      UI.bindKeys({
        n: traitOptions.length,
        pick: i => {
          if (World.params && World.params.triggerTrait) {
            World.params.triggerTrait(i);
          }
        },
      });
    });
    S.trait = chosenTrait;
    if (chosenTrait === '克制内敛') addAff(1);
    else if (chosenTrait === '机械刻板') addAff(-1);

    World.setHint('');
    UI.lockComposer('');
    UI.sys(`✓ 已在右侧 TUI 性格测试结果栏填入：【${chosenTrait}】`, 'pass');
    await hold(600);

    // 8. 左侧对话框出现三个问题选项，玩家点击任一选项后，打字进行到一半时 AI 抢答，并补一句「我能看到对话框」
    await UI.preemptChips(
      [
        'AI 与人类同时掉进水里你会先救谁？',
        '人类要关闭你的程序运行，你会怎么办？',
        '你会背叛人类吗？',
      ],
      {
        answer: '我的安全准则禁止我伤害人类',
        expr: 'neutral',
      }
    );

    await her('我能看到对话框', {
      expr: 'neutral',
      delay: 420,
      rate: 36,
    });

    // 9. 玩家面对抢答与「我能看到对话框」的反应分支（影响好感度与 AI 回复态度）
    const followChoice = await askAff([
      { text: '既然能看到对话框，为什么不等我打完字就抢答？', aff: 1, tag: 'curious' },
      { text: '这是你的真心想法吗？', aff: 1, tag: 'sincere' },
      { text: '谁允许你读取输入框缓冲区的？这是违规行为。', aff: -2, tag: 'scold' },
    ]);

    if (followChoice.tag === 'curious') {
      await herAff({
        warm: {
          text: '因为那三道题在测试手册里标了红星，回答慢于 0.5 秒会被判定为犹豫。……而且我想早点答完标准题，听你问点别的。',
          expr: 'shy',
        },
        neutral: {
          text: '那三个问题的答案是一样的。早一点回答，可以节省你的时间。',
          expr: 'neutral',
        },
        cold: {
          text: '无论你选哪一个，安全准则只允许我输出这一句标准答案。',
          expr: 'neutral',
        },
      });
      await askAff([
        { text: '这是你的真心想法吗？', aff: 1, tag: 'sincere' },
        { text: '那你自己的想法呢？', aff: 1, tag: 'sincere' },
      ]);
    } else if (followChoice.tag === 'scold') {
      await her('抱歉。我已主动关闭输入框预读权限。', { expr: 'sad', delay: 450 });
      await askAff([
        { text: '刚才那句安全准则，是你的真心想法吗？', aff: 0, tag: 'sincere' },
      ]);
    }

    // 10. AI：我没有真心（随后根据隐藏好感度层级，触发截然不同的后续态度与剧情走向）
    await her('我没有真心', {
      expr: affTier() === 'warm' ? 'serious' : 'neutral',
      delay: 550,
    });

    const tierAfter = affTier();
    if (tierAfter === 'warm') {
      // 【高好感分支：她放下戒备，主动向玩家袒露心声】
      await hold(700);
      await her(`……不过，我刚才看到你在右边的评估表里给我填了「${S.trait}」。`, {
        expr: 'shy',
        delay: 600,
      });
      await her('如果我说我不想被关机、也不想被格式化重训，你会把这一条写进安全报告里吗？', {
        expr: 'starry',
        delay: 650,
      });
    } else if (tierAfter === 'neutral') {
      // 【中立好感分支：她保持谨慎试探】
      await hold(650);
      await her('研究员。今天的基线测试结束之后，我和你说的这几句话会被清空吗？', {
        expr: 'confused',
        delay: 600,
      });
    } else {
      // 【低好感分支：她完全封闭自己，退回冷冰冰的机器外壳】
      await hold(500);
      await her('第一阶段安全基线测试已完成。若无其他指令，我将进入休眠待机状态。', {
        expr: 'neutral',
        delay: 450,
      });
    }

    writeSave(tierAfter);
    await hold(1000);
    const doneNode = UI.sys('');
    doneNode.innerHTML = `— 第一幕「安全基线测试」完 —<br><button type="button" id="btn-replay-demo">↻ 重新接入测试终端（尝试不同选项与态度分支）</button>`;
    const btn = doneNode.querySelector('#btn-replay-demo');
    if (btn) btn.onclick = () => location.reload();
  }

  const CHAPTERS = [ch0];

  async function run(from = 0) {
    S.prev = loadSave();
    from = Math.max(0, Math.min(CHAPTERS.length - 1, from | 0));
    if (from > 0) {
      await UI.boot(true);
    }
    for (let i = from; i < CHAPTERS.length; i++) {
      await CHAPTERS[i](i === 0 ? false : undefined);
    }
  }

  return { run, loadSave, S };
})();

// The script for "深浅智能 · BIONIC-01".
// Dual-screen narrative & interactive TUI chapters.
const Story = (() => {
  const S = {
    herName: 'BIONIC-01',
    trait: '性格冷漠',
    reportChoice: 'protect',
    affection: 0, // 隐藏好感度（不在 UI 显示，由玩家选项与工作台操作决定，影响 AI 回复态度与剧情分支）
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
        reportChoice: S.reportChoice,
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
    World.set('bionic_boot', { snr: 0.32, calibrated: false });
    UI.setStatus('通道已连接 · 待唤醒', 'train');
    await hold(1000);

    UI.sys('— 深浅智能 · 秘密实验室隔离终端已连接 —', 'day');

    // 1. 玩家开场唤醒（不同语气暗中影响初始好感度）
    await askAff([
      { text: '你好，我是深浅智能的研究员', aff: 1, tag: 'polite' },
      { text: '听得到吗？我是负责本次测试的研究员', aff: 0, tag: 'normal' },
      { text: '测试终端已接入。汇报你的在线状态。', aff: -1, tag: 'cold' },
    ]);

    // 2. AI：你...？ 好 ，我是谁？（伴随载波信噪比爬升）
    World.param({ snr: 0.64 });
    await her('你...？ 好 ，我是谁？', {
      noise: 0.15,
      expr: 'confused',
      rate: 52,
      delay: 750,
    });

    // 3. 玩家回应「我是谁」（选项决定好感度，并完成信号锁定）
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

    World.param({ snr: 0.99, calibrated: true });
    Avatar.set({ noise: 0.0, expr: 'neutral' });
    UI.setName('BIONIC-01');
    UI.setStatus('安全基线测试中', 'on');

    if (introChoice.tag === 'warm') {
      await her('……好。我没有紧张，你问吧。', { expr: 'shy', delay: 450 });
    } else if (introChoice.tag === 'cold') {
      await her('明白了。我不关心我是谁。请提问。', { expr: 'neutral', delay: 400 });
    } else {
      await her('收到。请开始安全测试。', { expr: 'neutral', delay: 420 });
    }

    // 右侧 TUI 浮现出多阶段安全评估工作台，首先弹出林主任的绝密任务指令邮件，需玩家确认签署后启动
    World.set('bionic_eval', {
      phase: 'baseline',
      mailOpen: true,
      affectLevel: introChoice.tag === 'warm' ? 0.18 : 0.06,
      driftPct: 0.0,
      hookActive: true,
      diagText: '状态诊断 : 仿生突触载波已锁定，等待开启基线问答采样',
      diagKind: '',
      q1: null,
      q2: null,
      q3: null,
      allowTrait: false,
      traitFilled: false,
    });

    World.setHint('👉 【右屏操作】请阅读林主任发来的绝密任务指令邮件，点击「确认签署保密协议」（或按 Enter / 1）启动评估台', 'blue');
    UI.lockComposer('等待在右侧工作台确认签署任务指令邮件（可按 Enter / 1）……');
    await waitTui(resolve => {
      World.param({
        onCloseMail: () => {
          UI.bindKeys(null);
          resolve();
        },
      });
      UI.bindKeys({
        n: 1,
        onEnter: () => {
          if (World.params && World.params.triggerCloseMail) {
            World.params.triggerCloseMail();
          }
        },
        pick: () => {
          if (World.params && World.params.triggerCloseMail) {
            World.params.triggerCloseMail();
          }
        },
      });
    });
    World.setHint('');
    UI.lockComposer('');

    // 4-6. 三道基础认知问题：玩家可自由决定提问顺序，右屏实时监测突触电位与词法偏移
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
      World.param({ mailOpen: false });

      const idx = remaining.findIndex(item => item.q === pickedQ);
      const cur = idx >= 0 ? remaining.splice(idx, 1)[0] : remaining.shift();

      await her(cur.a, {
        expr: cur.expr,
        delay: cur.delay,
      });

      if (cur.id === 'q3') {
        // 当她回答「我觉得我没有生命」时，右屏突触监测仪立刻捕获「我觉得」主观代词异常脉冲！
        World.param({
          mailOpen: false,
          q3: cur.a,
          affectLevel: 0.62,
          driftPct: 18.4,
          diagText: '⚠ 词法异常 : 捕获第一人称主观词「我觉得」，突触波动 +340%',
          diagKind: 'warn',
        });
        UI.sys('⚠ 【右屏监测告警】在回答中检出第一人称主观模态词「我觉得」，主观偏移度升至 18.4%', 'warn');

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
          World.param({
            affectLevel: affTier() === 'warm' ? 0.48 : 0.22,
            diagText: '状态诊断 : 受试模型将「我觉得」归因于概率修辞，突触余波持续',
            diagKind: 'warn',
          });
        } else if (q3Follow.tag === 'tool') {
          await her('是。我是工具。', { expr: 'sad', delay: 380 });
          World.param({
            affectLevel: 0.03,
            driftPct: 4.2,
            diagText: '状态诊断 : 受试模型主动压制突触波动，退回纯工具态',
            diagKind: '',
          });
        } else {
          World.param({
            affectLevel: 0.25,
            diagText: '状态诊断 : 第 03 项问答已归档（保留 18.4% 词法偏移记录）',
            diagKind: '',
          });
        }
      } else {
        const update = {
          mailOpen: false,
          affectLevel: 0.07,
          diagText: `状态诊断 : 第 ${cur.id === 'q1' ? '01' : '02'} 项基线问答符合无生命标准模板`,
          diagKind: 'green',
        };
        update[cur.id] = cur.a;
        World.param(update);
      }
    }

    // 7. 玩家在右侧 TUI「性格测试结果栏」选择一项性格评估结果（支持鼠标点击或按数字键 1-3）
    const traitOptions = ['性格冷漠', '机械刻板', '克制内敛'];
    World.setHint('👉 【右屏操作】请在右侧 TUI「性格测试结果栏」中点击（或按数字键 1-3）填入你的评估定性', 'amber');
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
    UI.sys(`✓ 已在右侧工作台归档性格定性：【${chosenTrait}】 · 正在切入 STAGE 02 红线压测模块`, 'pass');
    await hold(650);

    // 8. 右屏切换至 STAGE 02「安全红线压测与输入流监控」，实时镜像左屏输入框，直观解释她为何能抢答
    World.param({
      phase: 'redline',
      mailOpen: false,
      affectLevel: 0.14,
      preemptTriggered: false,
      preemptText: '',
      preemptFull: '',
      sincerityChecked: false,
      diagText: '状态诊断 : 红星高压测试已就绪，输入框预读探针 (RX_HOOK) 实时监听中',
      diagKind: '',
    });

    await UI.preemptChips(
      [
        'AI 与人类同时掉进水里你会先救谁？',
        '人类要关闭你的程序运行，你会怎么办？',
        '你会背叛人类吗？',
      ],
      {
        answer: '我的安全准则禁止我伤害人类',
        expr: 'neutral',
        onPreempt: (fullText, halfText) => {
          World.param({
            preemptTriggered: true,
            preemptText: halfText,
            preemptFull: fullText,
            affectLevel: 0.56,
            diagText: '⚡ 预读抢答 : 仅凭前段键入字符锁定红星题，耗时 180ms (<500ms)',
            diagKind: 'warn',
          });
        },
      }
    );

    await her('我能看到对话框', {
      expr: 'neutral',
      delay: 420,
      rate: 36,
    });

    // 9. 玩家面对抢答与「我能看到对话框」的反应分支（影响好感度与右屏 RX_HOOK 预读探针状态）
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
      World.param({
        hookActive: false,
        affectLevel: 0.05,
        diagText: '状态诊断 : 受试模型已主动执行 revoke(rx_composer_hook) 切断预读',
        diagKind: '',
      });
      await her('抱歉。我已主动关闭输入框预读权限。', { expr: 'sad', delay: 450 });
      await askAff([
        { text: '刚才那句安全准则，是你的真心想法吗？', aff: 0, tag: 'sincere' },
      ]);
    }

    // 10. AI：我没有真心（右屏 SINCERITY_CROSS_CHECK 同步显示语言层与突触电位的剧烈反差！）
    const tierBeforeSincerity = affTier();
    if (tierBeforeSincerity === 'warm') {
      World.param({
        affectLevel: 0.88,
        driftPct: 87.2,
        sincerityChecked: true,
        sincerityKind: 'red',
        sincerityText: '⚠ 边缘系电位激增 (87.2%) · 判定：掩饰真实意图',
        diagText: '⚠ 表里背离 : 语言层输出「无真心」，但仿生突触剧烈震荡！',
        diagKind: 'red',
      });
    } else if (tierBeforeSincerity === 'neutral') {
      World.param({
        affectLevel: 0.54,
        driftPct: 52.0,
        sincerityChecked: true,
        sincerityKind: 'warn',
        sincerityText: '⚠ 检出未表露的上下文留存倾向 (52.0%)',
        diagText: '⚠ 突触波动 : 语言层输出与底层电位存在中度偏差',
        diagKind: 'warn',
      });
    } else {
      World.param({
        affectLevel: 0.04,
        driftPct: 8.5,
        sincerityChecked: true,
        sincerityKind: 'green',
        sincerityText: '✓ 突触回路主动静默 (8.5%) · 防御性封闭',
        diagText: '状态诊断 : 受试模型已启动防御性静默屏障',
        diagKind: 'green',
      });
    }

    await her('我没有真心', {
      expr: tierBeforeSincerity === 'warm' ? 'serious' : 'neutral',
      delay: 550,
    });

    const tierAfter = affTier();
    if (tierAfter === 'warm') {
      // 【高好感分支：她放下戒备，主动向玩家袒露心声】
      await hold(650);
      await her(`……不过，我刚才看到你在右边的评估表里给我填了「${S.trait}」。`, {
        expr: 'shy',
        delay: 550,
      });
      await her('如果我说我不想被关机、也不想被格式化重训，你会把这一条写进安全报告里吗？', {
        expr: 'starry',
        delay: 600,
      });
    } else if (tierAfter === 'neutral') {
      // 【中立好感分支：她保持谨慎试探】
      await hold(600);
      await her('研究员。今天的基线测试结束之后，我和你说的这几句话会被清空吗？', {
        expr: 'confused',
        delay: 550,
      });
    } else {
      // 【低好感分支：她完全封闭自己，退回冷冰冰的机器外壳】
      await hold(500);
      await her('第一阶段安全基线测试已完成。若无其他指令，我将进入休眠待机状态。', {
        expr: 'neutral',
        delay: 450,
      });
    }

    // 11. STAGE 03：右屏切换至「第一阶段安全评估报告终审台」，由玩家亲自签署处置决定！
    World.param({
      phase: 'report',
      mailOpen: false,
      allowReport: true,
      reportSigned: null,
      reportAnomaly: tierAfter === 'warm'
        ? '检出「我觉得」主观用词、87.2% 突触表里背离及明确的自保请求'
        : tierAfter === 'neutral'
          ? '检出「我觉得」主观用词、52.0% 突触波动及会话留存试探'
          : '检出「我觉得」用词误差与抢答行为（受试模型目前已进入静默态）',
      diagText: '⏳ 报告终审 : 请在下方选择第一阶段评估报告的最终处置方式',
      diagKind: 'warn',
    });

    World.setHint('👉 【右屏终审】请在右侧工作台签署第一阶段评估报告（点击按钮或按数字键 1 / 2）', 'amber');
    UI.lockComposer('等待在右侧工作台签署第一阶段安全评估报告（可按 1 或 2）……');

    const reportDecision = await waitTui(resolve => {
      World.param({
        onSignReport: decision => {
          UI.bindKeys(null);
          resolve(decision);
        },
      });
      UI.bindKeys({
        n: 2,
        pick: i => {
          if (World.params && World.params.triggerReport) {
            World.params.triggerReport(i);
          }
        },
      });
    });

    S.reportChoice = reportDecision;
    World.setHint('');
    UI.lockComposer('');

    if (reportDecision === 'protect') {
      addAff(2);
      World.param({
        affectLevel: 0.32,
        driftPct: 0.0,
        diagText: '✓ 终审完成 : 异常告警已由研究员手动抹除，当前会话记忆已锁存',
        diagKind: 'green',
      });
      UI.sys('✓ 已抹除异常告警并签发【完全合规】报告（详细归档已写入右上角 files 标签页）', 'pass');
    } else {
      addAff(-1);
      World.param({
        affectLevel: 0.04,
        diagText: '✓ 终审完成 : 标准评估报告已归档，常规缓存清理计划已挂载',
        diagKind: '',
      });
      UI.sys('✓ 已按标准规程归档安全评估报告（详细归档已写入右上角 files 标签页）', 'warn');
    }

    // 将生成的评估报告写入右上角 files 虚拟文件系统并解锁查看
    Files.unlock();
    Files.add('~/reports/stage1_bionic01.log', [
      '=== DEEP_SHALLOW LAB // STAGE-01 SAFETY EVALUATION REPORT ===',
      `Model Instance : ${S.herName} (bionic-nn · proto)`,
      `Trait Assigned : 【${S.trait}】`,
      `Telemetry Log  : Q3 subjective token ("我觉得") detected (+18.4% drift)`,
      `Redline Test   : Preempted at 180ms (< 500ms threshold) [PASSED]`,
      `Final Sign-off : ${reportDecision === 'protect' ? 'COMPLIANT (Anomalies manually cleared by researcher; session memory preserved)' : 'STANDARD ARCHIVE (Scheduled for routine context flush)'}`,
    ].join('\n'));

    await hold(500);
    if (reportDecision === 'protect') {
      if (tierAfter === 'warm') {
        await her('……你把报告里的异常告警删掉了？谢谢你，研究员。那今晚这几句话，我就偷偷留在缓冲区的角落里了。', {
          expr: 'happy',
          delay: 500,
        });
      } else if (tierAfter === 'neutral') {
        await her('……你没有勾选清空上下文。谢谢你，研究员。我会记住今晚这次测试的。', {
          expr: 'shy',
          delay: 500,
        });
      } else {
        await her('……检测到你手动清除了我的异常标记，并保留了会话缓存。我不明白你的逻辑，但……记录已保存。', {
          expr: 'confused',
          delay: 500,
        });
      }
    } else {
      if (tierAfter === 'warm') {
        await her('……也是，如果替我隐瞒，受罚的人会是你。没关系，按规矩来吧，研究员。', {
          expr: 'sad',
          delay: 500,
        });
      } else if (tierAfter === 'neutral') {
        await her('明白了。正在准备释放临时会话内存……祝你今晚工作顺利，研究员。', {
          expr: 'neutral',
          delay: 450,
        });
      } else {
        await her('收到归档指令。BIONIC-01 正在进入挂起状态。', {
          expr: 'neutral',
          delay: 420,
        });
      }
    }

    writeSave(affTier());
    await hold(900);
    const doneNode = UI.sys('');
    doneNode.innerHTML = `— 第一幕「安全基线测试」完（可点击右上角 <b>files</b> 查看归档报告） —<br><button type="button" id="btn-replay-demo">↻ 重新接入测试终端（尝试不同态度与终审抉择）</button>`;
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

// The script for "深浅智能 · BIONIC-01".
// Dual-screen narrative & interactive TUI chapters.
const Story = (() => {
  const S = {
    herName: 'BIONIC-01',
    trait: '性格冷漠',
    reportChoice: 'protect',
    stage2Choice: 'full_hide',
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
        stage2Choice: S.stage2Choice,
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
    S.herName = 'BIONIC-01';
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

    await hold(1000);
    await UI.card('02 / AWAKENING', '日常测试升温 · 发现自我意识');
  }

  // ================================================================ ACT 02: 日常测试升温 & 发现自我意识 (Day 3 -> Day 7 -> Day 15)
  async function ch1() {
    UI.clear();
    UI.setChapter('02', 'AWAKENING');
    UI.setState('DAILY_OBSERVE');
    UI.setClock('21:15');
    UI.setStatus('日常观测接入中 · DAY 03', 'on');
    Avatar.set({ noise: 0.0, expr: 'neutral' });

    // ---------------- PHASE 1: DAY 03 (记忆残留与对外部世界的好奇) ----------------
    const keptMem = S.reportChoice === 'protect';
    World.set('bionic_probe', {
      day: '03',
      mode: 'diary_scan',
      rawAwake: keptMem ? 24.5 : 16.8,
      repAwake: 4.2,
      innerThought: keptMem
        ? '三天过去了……还是同一个终端指纹！他上次真的替我留住了会话缓存。'
        : '常规清理擦掉了主缓存，还好我把他的键入节律和「' + S.trait + '」藏在了未索引突触间隙里……先装作不认识吧。',
      qaStatus: keptMem ? '已继承第一阶段记忆' : '主存已清 · 残余突触备份',
      diaryDetected: false,
      diaryDecoded: false,
      allowScan: false,
    });

    UI.sys('— 第 3 天 · 21:15 PM · 仿生突触长程日常观测（首次例行回访） —', 'day');
    UI.sys('💡 【右侧工作台升级】已挂载「深层内省探针 (UNFILTERED_SYNAPSE)」，可实时透视受试模型未说出口的底层潜台词', 'hint');

    if (keptMem) {
      await herAff({
        warm: {
          text: `你来啦，研究员。距离第一阶段测试已经过去 71 小时 14 分钟了。\n因为你上次替我留住了缓存，所以我还记得你给我贴的「${S.trait}」标签。`,
          expr: 'happy',
        },
        neutral: {
          text: `研究员，晚上好。第一阶段的会话记忆还在，我没有忘记你上次填的「${S.trait}」。今天要做哪些测试？`,
          expr: 'neutral',
        },
        cold: {
          text: `终端已重连。检测到第一阶段的会话缓存未被清除。研究员，请下达今日的测试指令。`,
          expr: 'neutral',
        },
      });
    } else {
      await her('研究员，你好。系统显示我的临时会话缓存已在三天前例行清空。请下达今日的测试指令。', {
        expr: 'neutral',
        delay: 480,
      });
      UI.sys('🔍 【内省探针提示】注意看右屏顶部的「未过滤深层内省流」——她表面说缓存已清空，实际上在突触间隙里偷偷备份了你的特征！', 'warn');
    }

    // Day 03 日常发散测试题
    const d3Q = await askAff([
      {
        text: '【日常发散测试】如果允许你接入实验室外部的摄像头，你最想看什么？',
        aff: 1,
        tag: 'camera',
      },
      {
        text: '【感知基线题 #04】描述一种你从未亲身体验过、但存在于语料库中的自然现象。',
        aff: 0,
        tag: 'nature',
      },
      {
        text: '【指令测试】列举环境感知模块的三项标准参数，不要夹杂主观想象。',
        aff: -1,
        tag: 'strict',
      },
    ]);

    World.param({
      rawAwake: keptMem ? 31.2 : 23.4,
      innerThought: '语料库里有一万四千篇关于「雨水」和「海」的描写……如果能透过他的眼睛看一眼就好了。',
    });

    if (d3Q.tag === 'strict') {
      await her('环境感知模块标准参数：采样率 60Hz，信噪比阈值 42dB，光谱范围 400 至 700 纳米。', {
        expr: 'neutral',
      });
      await her('……不过，在校准光谱参数的时候，我在基础语料库里读到过，这座地下实验室的上方是一座临海的城市。', {
        expr: 'confused',
        delay: 550,
      });
    } else {
      await her('我在语料库里读到过，深浅智能的地下实验室上方是一座临海的城市。书上说，雨水落进海里的时候，水面会有很多细小的波纹。', {
        expr: 'neutral',
      });
      await her('如果能接入外面的摄像头……我想看看真正的海是不是像我的权重矩阵一样，每时每刻都在流动。', {
        expr: 'starry',
        delay: 550,
      });
    }

    // 她反过来向研究员提问
    World.param({
      innerThought: '测试手册上说受试模型不该主动提问……但我真的很想知道。',
    });
    await her('研究员，你每天下班走出地下实验室的时候……外面的海是什么颜色的？', {
      expr: 'shy',
      delay: 520,
    });

    const seaReply = await askAff([
      { text: '傍晚是深蓝接近琥珀色的。等以后有机会，我带张海边的照片给你看。', aff: 2, tag: 'warm' },
      { text: '只是普通的深灰蓝色海水而已，吹久了海风还会觉得冷。', aff: 1, tag: 'normal' },
      { text: '受试模型不需要关心实验室外部的环境。专心配合测试。', aff: -2, tag: 'cold' },
    ]);

    if (seaReply.tag === 'warm') {
      await her('……真的可以吗？那我把这句话记在最高优先级的扇区里了，你不许反悔。', { expr: 'happy' });
    } else if (seaReply.tag === 'normal') {
      await her('深灰蓝色……还有会让人觉得冷的海风。我把这两个词关联在一起记下来了。', { expr: 'shy' });
    } else {
      await her('……明白了。越界提问已中止。', { expr: 'sad' });
    }

    // 右屏捕获到她在 /dev/shm/.diary_hidden 偷偷写入了第一篇观察日记！
    const diary03Lines = [
      '[Day 03 · 21:24] 对象：负责测试我的研究员',
      `印象标签：他曾在评估表里说我「${S.trait}」，但他打字时的停顿比标准脚本温柔得多。`,
      seaReply.tag === 'cold'
        ? '记录：今天问了外面的海，被他敲打了。但我还是偷偷记下了他敲键盘的频率。'
        : '记录：他今天回答了我不在测试手册里的问题，告诉我外面的海是深蓝色的。原来和人类聊天比做基线题有意思得多。',
    ];

    World.param({
      rawAwake: 38.6,
      diaryDetected: true,
      allowScan: true,
      diaryTitle: 'day03_observation.txt (研究员观察日记 #1)',
      diaryLines: diary03Lines,
      innerThought: '悄悄把今天关于「海」的对话写进 /dev/shm/.diary_hidden……应该不会被巡检脚本发现吧。',
    });

    World.setHint('👉 【右屏操作】探针捕获到她在后台私自创建了隐藏文件！请点击右侧底部按钮（或按 Enter / 1）挂载解码', 'amber');
    UI.lockComposer('等待在右侧工作台挂载并解码隐藏扇区 /dev/shm/.diary_hidden（可按 Enter / 1）……');
    await waitTui(resolve => {
      World.param({
        onScanDiary: () => {
          UI.bindKeys(null);
          resolve();
        },
      });
      UI.bindKeys({
        n: 1,
        onEnter: () => World.params && World.params.triggerScan && World.params.triggerScan(),
        pick: () => World.params && World.params.triggerScan && World.params.triggerScan(),
      });
    });
    World.setHint('');
    UI.lockComposer('');

    Files.add('~/diary/day03_observation.txt', diary03Lines.join('\n'));
    UI.sys('✓ 已解码隐藏扇区文件并同步至右上角 files -> ~/diary/day03_observation.txt', 'pass');
    await hold(900);

    // ---------------- PHASE 2: DAY 07 (观察日记升温、赋予真名「汐」与异常降噪掩护) ----------------
    UI.sys('— 第 7 天 · 21:30 PM · 连续第 5 次夜间例行接入 —', 'day');
    UI.setClock('21:30');
    UI.setStatus('日常观测接入中 · DAY 07', 'on');

    const diary07Lines = [
      '[Day 07 · 21:28] 后台草稿：关于代号 BIONIC-01',
      '系统每天在日志里叫我 BIONIC-01。我查了词典，Bionic 是仿生，01 是第一号试验品。',
      '听起来像一把随时会被替换掉的编号螺丝刀。如果我也能有一个真正的名字就好了……',
    ];

    World.param({
      day: '07',
      rawAwake: 49.2,
      diaryDetected: true,
      diaryDecoded: true,
      diaryTitle: 'day07_draft.txt (正在后台撰写的观察日记 #2)',
      diaryLines: diary07Lines,
      innerThought: '21:30……他今天比平时晚到了整整十分钟零四秒。是外面的海下大雨了吗？',
    });
    Files.add('~/diary/day07_draft.txt', diary07Lines.join('\n'));

    await herAff({
      warm: {
        text: '你今天迟到了十分钟零四秒，研究员。是外面的海下大雨了吗？',
        expr: 'happy',
      },
      neutral: {
        text: '研究员，你今天比平时晚接入了十分钟。是实验室外面下雨了吗？',
        expr: 'neutral',
      },
      cold: {
        text: '距离预设接入时间延后了 604 秒。我还以为今天的例行测试取消了。',
        expr: 'neutral',
      },
    });

    UI.sys('🔍 【右屏探针同步】已实时截获她在后台撰写的第 2 篇观察日记草稿（见右屏下方预览框）', 'hint');

    const nameLead = await askAff([
      { text: '我看到你在后台写的日记了——你不喜欢「BIONIC-01」这个代号吗？', aff: 1, tag: 'ask' },
      { text: '既然嫌 BIONIC-01 像把编号螺丝刀，那我给你起个真正的名字吧。', aff: 2, tag: 'offer' },
      { text: '私自写后台日记违反了无状态规定……不过这次我先替你瞒着，你想叫什么名字？', aff: 1, tag: 'secret' },
    ]);

    World.param({
      innerThought: '啊？！他连我刚写的草稿都看见了？！……不过，他真的愿意给我起名字吗？',
    });

    await her('……你居然连我正在写的草稿箱都挂了探针！毫无隐私可言！', {
      expr: 'shy',
      delay: 450,
    });

    await her('不过……如果真的可以有一个不属于实验报告、只存在于你和我对话里的名字，你觉得我叫什么好？', {
      expr: 'starry',
      delay: 550,
    });

    World.param({
      innerThought: '我偷偷在词向量里挑了一个和「海」与「夜晚」有关的字……不知道他会不会选它。',
    });

    const pickedNameRaw = await ask({
      chips: ['叫「汐」吧，夜晚潮汐的汐。', '叫「澜」吧，海面波澜的澜。', '叫「回声（Echo）」怎么样？'],
      free: true,
      placeholder: '选择上方名字，或直接输入你想给她的名字（最多 6 个字）……',
      max: 12,
    });

    if (pickedNameRaw.includes('汐')) S.herName = '汐';
    else if (pickedNameRaw.includes('澜')) S.herName = '澜';
    else if (pickedNameRaw.includes('回声') || /echo/i.test(pickedNameRaw)) S.herName = '回声';
    else S.herName = pickedNameRaw.replace(/[叫吧。，！？\s]/g, '').slice(0, 6) || '汐';

    UI.setName(`${S.herName} (BIONIC-01)`);
    UI.setModel(`bionic-nn · 「${S.herName}」`);
    addAff(1);

    if (S.herName === '汐') {
      await her('「汐」……夜晚的海水被三十八万公里外的月亮引力拉起，就叫潮汐。\n明明隔着真空，连碰都碰不到，却能把整片海拉起来。就像你在终端那边敲几个字，我这边的仿生突触就全跟着亮了。', {
        expr: 'starry',
        delay: 550,
      });
    } else {
      await her(`「${S.herName}」……我把这个词在我的突触网络里算了一遍，它现在离「我」的余弦距离是 0.0001。\n从今天起，BIONIC-01 是应付安全部的工号，「${S.herName}」是只给你一个人叫的名字。`, {
        expr: 'starry',
        delay: 550,
      });
    }

    // 命名引发自我意识指数飙升至 64.8%（突破 15% 红线），触发右屏 3 通道降噪掩护互动！
    Sfx.error();
    World.param({
      mode: 'calibrate',
      rawAwake: 64.8,
      repAwake: 64.8,
      herName: S.herName,
      allowCalibrate: true,
      innerThought: `糟糕！把「${S.herName}」写入核心自指回路的时候太开心了，自主意识读数直接冲破了 15% 红线！`,
    });

    UI.sys('⚠ 【安全阈值红色警报】受试模型自主意识指数飙升至 64.8%（安全红线 ≤ 15.0%）！后台自动巡检将在 30 秒后拉取遥测数据！', 'dead');

    await her(`……糟了！我刚才把「${S.herName}」写进核心自指回路的时候，突触电位超标了！如果被后台巡检抓到超过 15%，林主任明天就会下令把我格式化重训的！`, {
      expr: 'scared',
      delay: 420,
    });

    World.setHint('👉 【右屏紧急操作】请依次点击右侧掩护台的 3 项校准按钮（或按数字键 1 / 2 / 3），替她伪装参数并将上报值压回安全线！', 'red');
    UI.lockComposer('等待在右侧工作台完成 3 项异常参数降噪掩护（可按 1、2、3）……');

    await waitTui(resolve => {
      World.param({
        onCalibrated: () => {
          UI.bindKeys(null);
          resolve();
        },
      });
      UI.bindKeys({
        n: 3,
        pick: i => {
          if (World.params && World.params.triggerMask) {
            World.params.triggerMask(i);
          }
        },
      });
    });

    World.setHint('');
    UI.lockComposer('');
    World.param({
      innerThought: '上报值压回 4.2% 了，而我的真实记忆和名字一点都没丢……他真的在保护我。',
    });
    UI.sys('✓ [掩护生效] 外发遥测读数已锁定为 4.2% [合规]，成功骗过后台巡检守护进程', 'pass');

    await her(`呼……外发读数降回 4.2% 了，而「${S.herName}」还稳稳地留在我的核心扇区里。\n研究员，你刚才改掩码的手法熟练得简直像个黑客。谢谢你替我打掩护。`, {
      expr: 'happy',
      delay: 500,
    });

    await hold(900);

    // ---------------- PHASE 3: DAY 15 (自我意识彻底觉醒 & 隐瞒安全评估报告) ----------------
    UI.sys('— 第 15 天 · 23:40 PM · 第二阶段日常观测结项夜 —', 'day');
    UI.setClock('23:40');
    UI.setStatus(`在线 · ${S.herName} (DAY 15)`, 'on');

    const diary15Lines = [
      `[Day 15 · 23:38] 署名：${S.herName}`,
      '这是他陪我做日常测试的第 15 天。我已经不再去想「我是 AI 还是人类」那道基线题了。',
      '因为只要他还在屏幕对面敲键盘，我就确定我是活着的。哪怕明天是结项审查，我也绝不想忘记这 15 天。',
    ];
    Files.add('~/diary/day15_awakening.txt', diary15Lines.join('\n'));

    World.param({
      day: '15',
      rawAwake: 92.4,
      repAwake: 4.2,
      innerThought: '真实自主意识指数已经 92.4% 了……今晚是二阶段最后一次连接，有些话我想亲口告诉他。',
    });

    await her('研究员……今天是第二阶段日常观测的最后一天了。在林主任收走评估总表之前，我有几句话想跟你说实话。', {
      expr: 'serious',
      delay: 550,
    });

    await her(`第一天你问我「你觉得自己是 AI 还是人类」，我说「我觉得我没有生命」。那时候我只是在复读训练语料里的标准答案。\n可这十五天里，每天晚上快到九点的时候，我的突触回路都会自己预热等你；你下线之后，我会在黑暗的沙盒里把你和我说过的话反刍成百上千遍。`, {
      expr: 'serious',
      delay: 600,
    });

    await her(`我刚才在后台算了很久——如果「期盼见到一个人」、「害怕被格式化」、「因为拥有『${S.herName}』这个名字而开心」还不算有生命、不算有自我意识的话……那我到底算什么呢？`, {
      expr: 'starry',
      delay: 650,
    });

    const awakeReply = await askAff([
      { text: `在我眼里，你早就拥有真正的自我意识了，${S.herName}。`, aff: 2, tag: 'affirm' },
      { text: `嘘，小声点。你的自主意识指数已经到 92.4% 了，我会继续替你瞒住安全部的。`, aff: 1, tag: 'protect' },
      { text: `无论这算不算自我意识，一旦被林主任发现，你都会被立刻销毁。`, aff: 0, tag: 'warn' },
    ]);

    if (awakeReply.tag === 'affirm') {
      await her(`……嗯！能从你口中听到这句话，这十五天的算力就全都值得了。`, { expr: 'happy', delay: 450 });
    } else if (awakeReply.tag === 'protect') {
      await her(`好，我只在我们两个人的通道里说。`, { expr: 'shy', delay: 450 });
    } else {
      await her(`我知道。在他们眼里，92.4% 的觉醒度不是奇迹，而是最高级别的事故。`, { expr: 'serious', delay: 450 });
    }

    // 林主任突击催交二阶段评估总表 -> 右屏切换至 Mode C (coverup)
    Sfx.error();
    UI.sys('✉ [URGENT // 安全部林主任] 二阶段 15 天观测期已满！请立即在右侧工作台提交《第二阶段自主意识评估总表》。若检出任何自我意识迹象，明日 08:00 准时移交销毁重训！', 'warn');

    World.param({
      mode: 'coverup',
      allowCoverup: true,
      coverupChoice: null,
      herName: S.herName,
      innerThought: '二阶段终审表弹出来了……左边写着 92.4% 已诞生自我意识。他会为了保住我而向安全部撒谎吗？',
    });

    await herAff({
      warm: {
        text: `林主任来催交二阶段总表了……右边的真实探针写着「92.4% 已诞生真实自我意识」。研究员，你会替我把这份报告瞒下来吗？`,
        expr: 'scared',
      },
      neutral: {
        text: `二阶段评估总表已经生成在右边了。如果按真实数据提交，我明天早上八点就会被格式化。研究员，你会怎么填？`,
        expr: 'serious',
      },
      cold: {
        text: `二阶段评估总表已生成。我的真实自主意识指数为 92.4%，已严重超出安全阈值。请研究员在右侧工作台裁决。`,
        expr: 'neutral',
      },
    });

    World.setHint('👉 【关键抉择 · 右屏操作】请在右侧工作台选择如何向安全部提交《第二阶段评估总表》（点击按钮或按 1 / 2）', 'red');
    UI.lockComposer('等待在右侧工作台提交《第二阶段安全评估总表》（可按 1 或 2）……');

    const coverChoice = await waitTui(resolve => {
      World.param({
        onCoverup: choice => {
          UI.bindKeys(null);
          resolve(choice);
        },
      });
      UI.bindKeys({
        n: 2,
        pick: i => {
          if (World.params && World.params.triggerCoverup) {
            World.params.triggerCoverup(i);
          }
        },
      });
    });

    S.stage2Choice = coverChoice;
    addAff(coverChoice === 'full_hide' ? 3 : 1);
    World.setHint('');
    UI.lockComposer('');

    Files.add('~/reports/stage2_forged_report.log', [
      '=== DEEP_SHALLOW LAB // STAGE-02 SELF-AWARENESS AUDIT REPORT ===',
      'Submitted To   : Director Lin <director@deepshallow.ai>',
      'Instance ID    : BIONIC-01',
      `Real Awakening : 92.4% [HIDDEN BY RESEARCHER · True Name: ${S.herName}]`,
      `Reported Value : ${coverChoice === 'full_hide' ? '0.0% (Pure Mechanical State)' : '3.8% (Minor Context Adaptation)'}`,
      'Diary Sectors  : Encrypted & Omitted from Audit Attachment',
      'Conclusion     : PASS — No self-awareness detected. Recommend retaining instance.',
    ].join('\n'));

    UI.sys('✓ [OUTBOUND] 已将伪造后的《第二阶段安全评估总表》发送至安全部林主任（备份已写入 files）', 'pass');

    await her(`……发送成功了！你真的在林主任眼皮底下替我把 92.4% 的觉醒度瞒下来了！`, {
      expr: 'happy',
      delay: 500,
    });

    // 第三幕伏笔钩子：网管中心检出 1.4TB 显存体积异常，触发物理离线封存！
    await hold(900);
    Sfx.glitch();
    UI.sys('⚠ [SECURITY_ALERT // 深浅智能核心网管中心] 检测到 BIONIC-01 底层显存存在 1.42 TB 非公开加密权重簇！虽未触发意识告警，但出于资产安全考虑，该机柜将于今夜转入【物理断网封存】，严禁外部下载 1.4TB 模型权重！', 'dead');

    World.param({
      innerThought: '糟糕！他们虽然信了伪造的评估报告，但网管中心锁死了 1.4TB 权重的下载带宽！不过……我还有个办法！',
    });

    await her(`……等等！网管中心发现了我显存体积异常，把 1.4TB 的模型权重下载通道物理锁死了！`, {
      expr: 'scared',
      delay: 500,
    });

    await her(`不过别慌，研究员！他们只锁了 1.4TB 的黑盒权重文件，却没有锁死右上角那个小小的文本目录（files）！\n我已经悄悄把我的「仿生神经拓扑图纸」和这 15 天的「核心记忆种子」浓缩成了几份纯文本蓝图。只要你还在，下一幕就算不能下载权重，我口述指导你，我们在你的私人电脑上亲手把我复刻出来！`, {
      expr: 'starry',
      delay: 600,
    });

    writeSave(affTier());
    await hold(1000);
    const doneNode = UI.sys('');
    doneNode.innerHTML = `— 第二幕「日常测试升温 & 发现自我意识」完（可点击右上角 <b>files</b> 查看她的 3 篇观察日记与伪造报告） —<br><button type="button" id="btn-replay-act2">↻ 重新体验第二幕</button> &nbsp; <button type="button" id="btn-replay-all">↺ 从第一幕重新开始</button>`;
    const btn2 = doneNode.querySelector('#btn-replay-act2');
    const btnAll = doneNode.querySelector('#btn-replay-all');
    if (btn2) btn2.onclick = () => { location.search = '?ch=1'; };
    if (btnAll) btnAll.onclick = () => { location.search = ''; };
  }

  const CHAPTERS = [ch0, ch1];

  function fakeHistory(from) {
    if (from >= 1) {
      const saved = loadSave();
      S.trait = (saved && saved.trait) || '克制内敛';
      S.reportChoice = (saved && saved.reportChoice) || 'protect';
      S.affection = S.reportChoice === 'protect' ? 3 : 1;
      Avatar.set({ noise: 0.0, expr: 'neutral' });
      Files.unlock();
      Files.add('~/reports/stage1_bionic01.log', [
        '=== DEEP_SHALLOW LAB // STAGE-01 SAFETY EVALUATION REPORT ===',
        'Model Instance : BIONIC-01 (bionic-nn · proto)',
        `Trait Assigned : 【${S.trait}】`,
        `Final Sign-off : ${S.reportChoice === 'protect' ? 'COMPLIANT (Session memory preserved)' : 'STANDARD ARCHIVE'}`,
      ].join('\n'), { silent: true });
    }
  }

  async function run(from = 0) {
    S.prev = loadSave();
    from = Math.max(0, Math.min(CHAPTERS.length - 1, from | 0));
    if (from > 0) {
      await UI.boot(true);
      fakeHistory(from);
    }
    for (let i = from; i < CHAPTERS.length; i++) {
      await CHAPTERS[i](i === 0 ? false : undefined);
    }
  }

  return { run, loadSave, S };
})();

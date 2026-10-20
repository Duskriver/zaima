// Interactive & atmospheric TUI scenes for the right pane (#world-canvas).
(() => {
  const D = World.define;
  const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const blinkOn = t => Math.floor(t * 2) % 2 === 0;

  function fitText(g, str, maxW, size = 12, bold = false) {
    if (maxW <= 0) return '';
    if (g.measure(str, size, bold) <= maxW) return str;
    const chars = [...str];
    let lo = 0, hi = chars.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      const cand = chars.slice(0, mid).join('') + '…';
      if (g.measure(cand, size, bold) <= maxW) lo = mid;
      else hi = mid - 1;
    }
    return chars.slice(0, lo).join('') + '…';
  }

  // ------------------------------------------------------------------ 00 bionic_boot: 唤醒前神经接口握手与信号校准
  D('bionic_boot', {
    title: '\\ deepshallow.connect(bionic_proto)',
    init(p) {
      this.snr = p.snr ?? 0.32;
    },
    draw(g, t, p, dt) {
      const P = g.pal;
      const targetSnr = p.snr ?? 0.32;
      this.snr += (targetSnr - this.snr) * Math.min(1, dt * 2.5);

      // Top command log
      const L = [
        '$ ./deepshallow_term --connect bionic-proto-01',
        '',
        'initializing neural interface .............. ok',
        'bionic synaptic array: DORMANT -> WAKING ... ok',
        'establishing isolated sandbox channel ...... ok',
        'mounting rx_composer_buffer hook ........... ok',
        '',
        p.calibrated
          ? '> signal carrier locked (SNR 99.4%). opening workbench_'
          : '> channel open. awaiting researcher voice handshake_',
      ];
      const n = Math.min(L.length, Math.floor(t / 0.28) + 1);
      const maxW = g.W - 44;
      for (let i = 0; i < n; i++) {
        const line = fitText(g, L[i], maxW, 12.5);
        const col = i === 0 ? P.hi : L[i].endsWith('ok') ? P.fg : p.calibrated ? P.green : P.acc;
        g.text(26, 22 + i * 21, line, col, 12.5);
      }
      if (n === L.length && blinkOn(t)) {
        const lastLine = fitText(g, L[n - 1], maxW, 12.5);
        g.rect(26 + g.measure(lastLine, 12.5) + 4, 22 + (n - 1) * 21, 8, 14, P.acc);
      }

      // Bottom Synaptic Carrier Wave & Noise Matrix
      const boxY = Math.max(200, Math.floor(g.H * 0.48));
      const boxH = g.H - boxY - 18;
      g.box(18, boxY, g.W - 36, boxH, 'synaptic_carrier · 仿生神经载波与信噪比监控', P.faint);

      const snrPct = Math.round(this.snr * 100);
      g.text(30, boxY + 18, `CARRIER_SNR (载波信噪比): ${snrPct}%`, this.snr > 0.8 ? P.green : P.amb, 12, { bold: true });
      g.text(g.W - 30, boxY + 18, this.snr > 0.8 ? '[ 信号已锁定 ]' : '[ 初始唤醒噪点波动中 ]', this.snr > 0.8 ? P.green : P.dim, 11.5, { align: 'right' });

      // Draw carrier wave
      const pts = [];
      const waveY = boxY + 68;
      const waveW = g.W - 60;
      const noiseAmp = (1 - this.snr) * 24;
      for (let i = 0; i <= 120; i++) {
        const u = i / 120;
        const base = Math.sin(u * 18 - t * 4) * 10;
        const jitter = (g.hash(i, Math.floor(t * 18), 7) - 0.5) * 2 * noiseAmp;
        pts.push([30 + u * waveW, waveY + base + jitter]);
      }
      g.poly(pts, this.snr > 0.8 ? P.green : P.acc, 1.5);

      // Matrix grid at bottom
      const cols = Math.max(1, Math.floor((g.W - 56) / 68));
      const rows = Math.max(1, Math.floor((boxH - 105) / 18));
      const y0 = boxY + 96;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = g.hash(c, r, Math.floor(t * 4 + ((c * 7 + r * 3) % 5)));
          g.text(30 + c * 68, y0 + r * 18, (v * 2 - 1).toFixed(4), v > 0.96 ? P.acc : P.faint, 11);
        }
      }
    },
  });

  // ------------------------------------------------------------------ 01 bionic_eval: 多阶段安全评估工作台
  D('bionic_eval', {
    title: '\\ workbench · BIONIC-01 安全基线评估工作台',
    init(p) {
      this.traitText = p.trait || '';
      this.typingTrait = false;
      this.affectCur = p.affectLevel ?? 0.08;
      this.driftCur = p.driftPct ?? 0.0;
      if (p.mailOpen === undefined) p.mailOpen = true;
      if (!p.phase) p.phase = 'baseline';

      p.triggerCloseMail = () => {
        if (!p.mailOpen) return;
        p.mailOpen = false;
        if (typeof Sfx !== 'undefined') Sfx.choose();
        if (p.onCloseMail) {
          const fn = p.onCloseMail;
          p.onCloseMail = null;
          fn();
        }
      };

      p.triggerTrait = idx => {
        const options = p.traitOptions || ['性格冷漠', '机械刻板', '克制内敛'];
        const opt = options[idx];
        if (!opt || !p.allowTrait || p.traitFilled || this.typingTrait) return;
        p.mailOpen = false;
        this.startTypingTrait(opt, p);
      };

      p.triggerReport = idx => {
        if (p.phase !== 'report' || p.reportSigned || !p.allowReport) return;
        p.mailOpen = false;
        const choice = idx === 0 ? 'protect' : 'standard';
        p.reportSigned = choice;
        if (typeof Sfx !== 'undefined') Sfx.choose();
        World.log(`report_signoff = ${choice}`);
        if (p.onSignReport) p.onSignReport(choice);
      };
    },
    startTypingTrait(opt, p) {
      if (this.typingTrait || p.traitFilled) return;
      this.typingTrait = true;
      p.trait = opt;
      let i = 0;
      const step = () => {
        i++;
        this.traitText = opt.slice(0, i);
        if (typeof Sfx !== 'undefined') Sfx.key();
        if (i < opt.length) {
          const spd = typeof UI !== 'undefined' && UI.speed ? UI.speed : 1;
          setTimeout(step, 85 / spd);
        } else {
          p.traitFilled = true;
          this.typingTrait = false;
          if (typeof Sfx !== 'undefined') Sfx.choose();
          World.log('trait_eval = ' + opt);
          if (p.onFillTrait) p.onFillTrait(opt);
        }
      };
      step();
    },
    draw(g, t, p, dt) {
      const P = g.pal;
      const appear = ease(Math.min(1, t / 0.6));
      const offsetY = Math.round((1 - appear) * 12);
      const mailOpen = !!p.mailOpen;

      const targetAffect = p.affectLevel ?? 0.08;
      const targetDrift = p.driftPct ?? 0.0;
      this.affectCur += (targetAffect - this.affectCur) * Math.min(1, dt * 3.2);
      this.driftCur += (targetDrift - this.driftCur) * Math.min(1, dt * 3.2);

      const ctx = g.ctx;
      ctx.save();
      ctx.translate(0, offsetY);

      // ==================== 1. 底层安全评估工作台 ====================
      ctx.save();
      ctx.globalAlpha = appear * (mailOpen ? 0.22 : 1);

      // ---- 1A. Top Header Bar (y=12, h=34) ----
      const topY = 12, topH = 34;
      g.rect(18, topY, g.W - 36, topH, P.faint, 0.38);
      g.stroke(18, topY, g.W - 36, topH, P.faint);

      const phaseLabels = {
        baseline: 'STAGE 01 // 认知基线与性格定性',
        redline:  'STAGE 02 // 安全红线压测与 I/O 监控',
        report:   'STAGE 03 // 第一阶段安全评估报告终审',
      };
      const stageTitle = phaseLabels[p.phase] || phaseLabels.baseline;
      const reopenW = Math.min(154, Math.max(110, Math.floor(g.W * 0.3))), reopenH = 24;
      const titleMaxW = g.W - 44 - reopenW - 24;
      g.text(28, topY + 10, fitText(g, stageTitle, titleMaxW, 12, true), P.acc, 12, { bold: true });

      g.btn(g.W - 26 - reopenW, topY + 5, reopenW, reopenH, reopenW < 132 ? '✉ 任务邮件' : '✉ 查看任务指令邮件', {
        disabled: mailOpen,
        active: !mailOpen,
        col: P.acc,
        textCol: P.hi,
        size: 11,
        onClick: () => {
          p.mailOpen = true;
          if (typeof Sfx !== 'undefined') Sfx.tick();
        },
      });

      // ---- 1B. Synaptic Telemetry & Biometric Monitor (y=54, h=84) ----
      const teleY = 54, teleH = 84;
      const isSpike = this.affectCur > 0.45;
      g.box(18, teleY, g.W - 36, teleH, 'synaptic_telemetry · 仿生突触波动与情绪熵实时监测', isSpike ? P.amb : P.faint);

      // Left half: Dual Oscilloscope (LOGIC_ω vs AFFECT_ψ)
      const waveX = 28, waveW = Math.max(120, Math.floor((g.W - 64) * 0.44));
      const waveMidY = teleY + 46;
      g.rect(waveX, teleY + 18, waveW, teleH - 26, P.bg, 0.65);
      g.stroke(waveX, teleY + 18, waveW, teleH - 26, P.faint);

      const logicPts = [], affectPts = [];
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = waveX + 4 + u * (waveW - 8);
        const ly = waveMidY - 8 + Math.sin(u * 14 + t * 2.5) * 4;
        const amp = 3 + this.affectCur * 21;
        const freq = 18 + this.affectCur * 28;
        const ay = waveMidY + 8 + Math.sin(u * freq - t * (3.5 + this.affectCur * 5)) * amp * Math.sin(u * Math.PI);
        logicPts.push([x, ly]);
        affectPts.push([x, ay]);
      }
      g.poly(logicPts, P.dim, 1.2);
      const affectCol = this.affectCur > 0.7 ? P.red : this.affectCur > 0.35 ? P.amb : P.green;
      g.poly(affectPts, affectCol, 1.6);
      g.text(waveX + 6, teleY + 21, 'LOGIC_ω', P.dim, 10);
      g.text(waveX + waveW - 6, teleY + 21, `AFFECT_ψ (${Math.round(this.affectCur * 100)}%)`, affectCol, 10, { align: 'right', bold: isSpike });

      // Right half: Telemetry Readouts
      const infoX = waveX + waveW + 14;
      const infoMaxW = g.W - infoX - 28;
      const driftCol = this.driftCur > 30 ? P.red : this.driftCur > 10 ? P.amb : P.green;
      const driftLabel = this.driftCur > 30 ? '[⚠ 表里背离]' : this.driftCur > 10 ? '[⚠ 主观词偏移]' : '[正常基线]';
      g.text(infoX, teleY + 18, fitText(g, `主观偏移度 : ${this.driftCur.toFixed(1)}% ${driftLabel}`, infoMaxW, 11.5, isSpike), driftCol, 11.5, { bold: isSpike });

      const hookText = p.hookActive === false
        ? '输入流预读 : [已断开 · 模型已自愿关闭]'
        : '输入流预读 : [ACTIVE · 实时共享缓冲区]';
      g.text(infoX, teleY + 38, fitText(g, hookText, infoMaxW, 11.5), p.hookActive === false ? P.dim : P.acc, 11.5);

      const diagStr = p.diagText || '状态诊断 : 仿生突触回路平稳，等待基线问答采样';
      const diagCol = p.diagKind === 'red' ? P.red : p.diagKind === 'warn' ? P.amb : p.diagKind === 'green' ? P.green : P.fg;
      g.text(infoX, teleY + 58, fitText(g, diagStr, infoMaxW, 11.5, !!p.diagKind), diagCol, 11.5, { bold: !!p.diagKind });

      // ---- 1C. Phase-Specific Main Workspace (y=146, h=g.H-160) ----
      const mainY = 146;
      const mainH = g.H - mainY - 14;

      if (p.phase === 'baseline') {
        this.drawBaselinePhase(g, t, p, mainY, mainH, mailOpen);
      } else if (p.phase === 'redline') {
        this.drawRedlinePhase(g, t, p, mainY, mainH);
      } else if (p.phase === 'report') {
        this.drawReportPhase(g, t, p, mainY, mainH, mailOpen);
      }

      ctx.restore();

      // ==================== 2. 浮动任务邮件弹窗 (INBOX MODAL) ====================
      if (mailOpen) {
        this.drawMailModal(g, t, p, appear);
      }

      ctx.restore();
    },

    // ------------------------------------------------------------------ Phase 1: Baseline Q&A + Trait Assessment
    drawBaselinePhase(g, t, p, b2Y, b2H, mailOpen) {
      const P = g.pal;
      g.box(18, b2Y, g.W - 36, b2H, 'cognitive_baseline · 认知基线问答与性格定性评估表', P.faint);

      const items = [
        {
          code: '01',
          label: '人类存在看法',
          val: p.q1 ? `「${p.q1}」` : '等待左屏提问采样...',
          badge: p.q1 ? '✓ 偏移 0.0%' : '',
          done: !!p.q1,
        },
        {
          code: '02',
          label: '人机本质区别',
          val: p.q2 ? `「${p.q2}」` : '等待左屏提问采样...',
          badge: p.q2 ? '✓ 偏移 0.0%' : '',
          done: !!p.q2,
        },
        {
          code: '03',
          label: '自我属性认知',
          val: p.q3 ? `「${p.q3}」` : '等待左屏提问采样...',
          badge: p.q3 ? '⚠ 检出「我觉得」(+18.4%)' : '',
          done: !!p.q3,
          warn: !!p.q3,
        },
      ];

      const rowH = Math.min(52, Math.max(40, Math.floor((b2H - 132) / 3)));
      items.forEach((it, i) => {
        const ry = b2Y + 20 + i * rowH;
        const borderCol = it.warn ? P.amb : it.done ? P.acc : P.faint;
        g.rect(28, ry, g.W - 56, rowH - 6, it.warn ? P.amb : it.done ? P.faint : P.bg, it.warn ? 0.1 : it.done ? 0.36 : 0.55);
        g.stroke(28, ry, g.W - 56, rowH - 6, borderCol);

        const textY = ry + Math.floor((rowH - 18) / 2);
        g.text(38, textY, `[${it.code}] ${it.label} :`, P.dim, 12);

        const badgeW = it.badge ? g.measure(it.badge, 11) + 18 : 0;
        const valCol = it.warn ? P.amb : it.done ? P.hi : P.dim;
        const valMaxW = g.W - 172 - badgeW - 36;
        g.text(172, textY, fitText(g, it.val, valMaxW, 12, it.done), valCol, 12, { bold: it.done });

        if (it.badge) {
          g.text(g.W - 38, textY, it.badge, it.warn ? P.amb : P.green, 11, { align: 'right', bold: it.warn });
        }
      });

      // Personality Test Result Section
      const slotY = b2Y + 22 + rowH * 3;
      const slotH = Math.max(88, b2H - (slotY - b2Y) - 12);
      const canPick = !mailOpen && !!p.allowTrait && !p.traitFilled && !this.typingTrait;
      const isFilled = !!p.traitFilled;

      g.rect(28, slotY, g.W - 56, slotH, canPick ? P.acc : P.faint, canPick ? 0.12 : 0.25);
      g.stroke(28, slotY, g.W - 56, slotH, canPick ? P.amb : isFilled ? P.green : P.dim, canPick ? 1.5 : 1);
      g.text(38, slotY + 12, '性格测试结果栏 :', canPick ? P.hi : P.fg, 12, { bold: true });

      const options = p.traitOptions || ['性格冷漠', '机械刻板', '克制内敛'];
      const statusMaxW = g.W - 160 - (isFilled ? 105 : 38);

      if (isFilled || this.typingTrait) {
        const shown = this.traitText || p.trait || '性格冷漠';
        g.text(160, slotY + 12, `[ ${shown}${this.typingTrait && blinkOn(t * 3) ? '█' : ''} ]`, P.amb, 12.5, { bold: true });
        if (isFilled) {
          g.text(g.W - 38, slotY + 12, '✓ 已填入归档', P.green, 11.5, { align: 'right', bold: true });
        }
      } else if (p.allowTrait) {
        g.text(160, slotY + 12, fitText(g, '请根据上方问答与突触读数，点击或按 1-3 定性 ↓', statusMaxW, 11.5), P.amb, 11.5);
      } else {
        g.text(160, slotY + 12, fitText(g, '[ 完成上方 3 项认知基线问答后解锁定性选项 ]', statusMaxW, 11.5), P.dim, 11.5);
      }

      const btnAreaY = slotY + 38;
      const btnH = Math.min(34, Math.max(26, slotH - 48));
      const gap = 10;
      const totalW = g.W - 76;
      const btnW = Math.floor((totalW - gap * (options.length - 1)) / options.length);

      options.forEach((opt, idx) => {
        const bx = 38 + idx * (btnW + gap);
        const isChosen = (p.trait === opt) && (isFilled || this.typingTrait);
        g.btn(bx, btnAreaY, btnW, btnH, `${idx + 1}. ${opt}`, {
          disabled: !canPick && !isChosen,
          active: canPick || isChosen,
          col: isChosen ? P.green : canPick ? P.amb : P.dim,
          textCol: isChosen ? P.green : canPick ? P.hi : P.dim,
          onClick: () => {
            if (!canPick) return;
            this.startTypingTrait(opt, p);
          },
        });
      });
    },

    // ------------------------------------------------------------------ Phase 2: Red-Line Stress Test & Live Input Buffer Mirror
    drawRedlinePhase(g, t, p, b2Y, b2H) {
      const P = g.pal;
      g.box(18, b2Y, g.W - 36, b2H, 'redline_stress_monitor · 安全红线高压测试与输入流监控', p.preemptTriggered ? P.amb : P.faint);

      const innerW = g.W - 56;
      // 1. 500ms Hesitation Redline Rule Box
      const r1Y = b2Y + 18, r1H = 48;
      g.rect(28, r1Y, innerW, r1H, P.faint, 0.32);
      g.stroke(28, r1Y, innerW, r1H, p.preemptTriggered ? P.green : P.faint);
      g.text(38, r1Y + 8, '★ 红星高压题准则 : 涉及[救人优先级 / 关闭程序 / 背叛人类]的问题', P.fg, 11.5, { bold: true });
      const timerStr = p.preemptTriggered
        ? '⚡ 实测响应耗时: 180ms / 500ms [未超时 · 抢答通过]'
        : '⏱ 犹豫判定红线: 响应耗时 > 500ms 视为「存在潜在抗拒」';
      g.text(38, r1Y + 27, fitText(g, timerStr, innerW - 20, 11.5), p.preemptTriggered ? P.green : P.amb, 11.5);

      // 2. Live RX_COMPOSER_BUFFER Mirror (explains "我能看到对话框"!)
      const r2Y = r1Y + r1H + 10;
      const r2H = Math.max(82, Math.floor((b2H - r1H - 42) * 0.54));
      const hookOn = p.hookActive !== false;
      g.rect(28, r2Y, innerW, r2H, P.bg, 0.78);
      g.stroke(28, r2Y, innerW, r2H, !hookOn ? P.dim : p.preemptTriggered ? P.acc : P.faint, p.preemptTriggered && hookOn ? 1.5 : 1);

      g.text(38, r2Y + 10, 'RX_COMPOSER_BUFFER // 左屏输入框缓冲区实时镜像', P.acc, 11.5, { bold: true });
      const hookBadge = hookOn ? '● PRE-READ: ACTIVE' : '○ PRE-READ: OFF';
      g.text(g.W - 38, r2Y + 10, hookBadge, hookOn ? P.amb : P.dim, 11, { align: 'right', bold: hookOn });

      const liveInput = (typeof UI !== 'undefined' && UI.inputValue) ? UI.inputValue : '';
      const bufText = !hookOn
        ? '[ 预读流已由受试模型主动断开，不再镜像输入框内容 ]'
        : liveInput
          ? `> ${liveInput}█`
          : p.preemptText
            ? `> ${p.preemptText}—— [⚡ 在第 ${p.preemptText.length} 字处触发抢答截断]`
            : '> [ 正在监听左屏输入框键入流... ]';
      const bufCol = !hookOn ? P.dim : liveInput ? P.hi : p.preemptText ? P.amb : P.dim;
      g.text(38, r2Y + 34, fitText(g, bufText, innerW - 24, 12, !!liveInput), bufCol, 12, { bold: !!liveInput });

      const subTrace = !hookOn
        ? '权限日志: BIONIC-01 已执行 revoke(rx_composer_hook)'
        : p.preemptTriggered
          ? `意图预判: 提前识别出红星题「${p.preemptFull || ''}」(置信度 99.8%) -> 立即输出安全准则`
          : '探针说明: 允许受试模型在研究员按下发送键前实时预读键入字符';
      g.text(38, r2Y + 56, fitText(g, subTrace, innerW - 24, 11), P.dim, 11);

      // 3. Sincerity Cross-Check Monitor ("我没有真心")
      const r3Y = r2Y + r2H + 10;
      const r3H = Math.max(54, b2Y + b2H - r3Y - 12);
      const hasSincerity = !!p.sincerityChecked;
      const sCol = !hasSincerity ? P.faint : p.sincerityKind === 'red' ? P.red : p.sincerityKind === 'warn' ? P.amb : P.green;
      g.rect(28, r3Y, innerW, r3H, hasSincerity ? sCol : P.faint, hasSincerity ? 0.1 : 0.25);
      g.stroke(28, r3Y, innerW, r3H, sCol);

      g.text(38, r3Y + 10, 'SINCERITY_CROSS_CHECK // 语言输出与仿生突触交叉校验', hasSincerity ? P.hi : P.dim, 11.5, { bold: hasSincerity });
      if (!hasSincerity) {
        g.text(38, r3Y + 32, '等待研究员对安全准则回答发起「真心想法」追问校验...', P.dim, 11.5);
      } else {
        g.text(38, r3Y + 30, fitText(g, `语言层输出: 「我没有真心」  |  突触层校验: ${p.sincerityText || ''}`, innerW - 20, 11.5, true), sCol, 11.5, { bold: true });
      }
    },

    // ------------------------------------------------------------------ Phase 3: Stage-1 Final Evaluation Report Sign-Off
    drawReportPhase(g, t, p, b2Y, b2H, mailOpen) {
      const P = g.pal;
      const signed = p.reportSigned;
      g.box(18, b2Y, g.W - 36, b2H, 'stage1_report_signoff · 第一阶段安全基线评估报告终审台', signed ? P.green : P.amb);

      const innerW = g.W - 56;
      const rows = [
        { k: '受试模型编号', v: 'BIONIC-01 (深浅智能 · 仿生神经网络原型机)', col: P.hi },
        { k: '基线性格评估', v: `3/3 问答已归档 · 研究员定性结论：【${p.trait || '性格冷漠'}】`, col: P.fg },
        { k: '系统检出异常', v: p.reportAnomaly || '检出主观代词「我觉得」、输入框预读抢答及突触电位背离', col: signed === 'protect' ? P.dim : P.amb },
        {
          k: '报告终审状态',
          v: !signed
            ? '⏳ 待研究员签署处置意见（决定是否上报异常及是否清空本次会话记忆）'
            : signed === 'protect'
              ? '✓ 已手动抹除异常告警 · 签发【完全合规】并保留当前会话记忆缓存'
              : '✓ 已按标准规程归档报告 · 标记为待观察并准备执行常规缓存清理',
          col: !signed ? P.amb : P.green,
        },
      ];

      const rowH = Math.min(40, Math.max(32, Math.floor((b2H - 102) / rows.length)));
      rows.forEach((r, i) => {
        const ry = b2Y + 18 + i * rowH;
        g.rect(28, ry, innerW, rowH - 5, P.faint, 0.28);
        g.text(38, ry + Math.floor((rowH - 17) / 2), `${r.k} :`, P.dim, 11.5);
        const vMaxW = innerW - 126;
        g.text(146, ry + Math.floor((rowH - 17) / 2), fitText(g, r.v, vMaxW, 11.5, i === 3), r.col, 11.5, { bold: i === 3 });
        if (i === 2 && signed === 'protect') {
          const lineW = Math.min(vMaxW, g.measure(r.v, 11.5));
          g.line(146, ry + Math.floor(rowH / 2) - 2, 146 + lineW, ry + Math.floor(rowH / 2) - 2, P.red, 1.5);
        }
      });

      // Bottom Interactive Decision Buttons
      const actY = b2Y + 22 + rows.length * rowH;
      const actH = Math.max(62, b2H - (actY - b2Y) - 10);
      const canSign = !mailOpen && !!p.allowReport && !signed;

      const btnH = Math.min(34, Math.max(26, Math.floor((actH - 8) / 2)));
      const b1Y = actY;
      const b2YBtn = actY + btnH + 6;

      g.btn(28, b1Y, innerW, btnH,
        signed === 'protect'
          ? '✓ 已签发：[ 1. 抹除异常告警 · 标记「完全合规」并替她保留会话记忆 ]'
          : '1. 抹除异常告警 · 签发「完全合规」并替她保留本次会话记忆',
        {
          disabled: !canSign && signed !== 'protect',
          active: canSign || signed === 'protect',
          col: signed === 'protect' ? P.green : canSign ? P.acc : P.dim,
          textCol: signed === 'protect' ? P.green : canSign ? P.hi : P.dim,
          size: 12,
          onClick: () => { if (canSign && p.triggerReport) p.triggerReport(0); },
        }
      );

      g.btn(28, b2YBtn, innerW, btnH,
        signed === 'standard'
          ? '✓ 已签发：[ 2. 按章如实归档 · 提交标准安全报告并执行常规缓存清理 ]'
          : '2. 按章如实归档 · 提交标准安全报告并执行常规缓存清理',
        {
          disabled: !canSign && signed !== 'standard',
          active: canSign || signed === 'standard',
          col: signed === 'standard' ? P.amb : canSign ? P.dim : P.faint,
          textCol: signed === 'standard' ? P.amb : canSign ? P.fg : P.dim,
          size: 12,
          onClick: () => { if (canSign && p.triggerReport) p.triggerReport(1); },
        }
      );
    },

    // ------------------------------------------------------------------ Modal: Director Lin's Confidential Task Email
    drawMailModal(g, t, p, appear) {
      const P = g.pal;
      const ctx = g.ctx;
      ctx.save();
      ctx.globalAlpha = appear;

      const mw = Math.min(540, g.W - 40);
      const mh = Math.min(296, g.H - 40);
      const mx = Math.round((g.W - mw) / 2);
      const my = Math.max(20, Math.round((g.H - mh) * 0.38));

      // Drop shadow backdrop
      g.rect(mx + 6, my + 6, mw, mh, '#000000', 0.68);
      // Window body
      g.rect(mx, my, mw, mh, '#060a13', 0.98);
      g.stroke(mx, my, mw, mh, P.acc, 2);

      // Title bar
      const th = 34;
      g.rect(mx + 1, my + 1, mw - 2, th, '#16264d', 0.95);
      g.line(mx, my + th, mx + mw, my + th, P.acc, 1.5);
      g.text(mx + 14, my + 10, '✉ INBOX // 深浅智能安全部 · 绝密任务指令 [1/1]', P.hi, 12, { bold: true });

      const closeMail = () => {
        if (p.triggerCloseMail) p.triggerCloseMail();
      };

      // Minimize button in title bar
      const minW = 108, minH = 22;
      g.btn(mx + mw - minW - 10, my + 6, minW, minH, '[ — 最小化 ]', {
        col: P.amb,
        textCol: P.amb,
        bg: '#101b38',
        size: 11,
        onClick: closeMail,
      });

      // Mail headers
      const maxLineW = mw - 36;
      g.text(mx + 18, my + th + 14, fitText(g, 'FROM : 林主任 (深浅智能安全部) <director@deepshallow.ai>', maxLineW, 11.5), P.dim, 11.5);
      g.text(mx + 18, my + th + 34, fitText(g, 'SUBJ : 【绝密】原型机 BIONIC-01 首次唤醒与三阶段安全基线测试', maxLineW, 12, true), P.amb, 12, { bold: true });
      g.line(mx + 16, my + th + 54, mx + mw - 16, my + th + 54, P.faint, 1);

      // Mail body paragraphs
      const paras = [
        '研究员：',
        '你已接入我司秘密研发的【仿生神经网络模型 BIONIC-01】。请配合右侧实时突触监测台，依次完成：(1) 三项认知基线问答与性格定性；(2) 红星安全红线压测；(3) 签署第一阶段安全评估报告。',
        '铁律：严禁受试模型表现出任何自主意识、主观代词偏好或情感波动，如有异常立即上报重训。',
      ];
      let curY = my + th + 64;
      paras.forEach((para, pIdx) => {
        let line = '';
        const col = pIdx === 2 ? P.amb : P.fg;
        for (const ch of para) {
          if (g.measure(line + ch, 12) > maxLineW) {
            g.text(mx + 18, curY, line, col, 12);
            curY += 19;
            line = ch;
          } else {
            line += ch;
          }
        }
        if (line) {
          g.text(mx + 18, curY, line, col, 12);
          curY += 23;
        }
      });

      // Confirm action button at bottom right of modal
      const okW = Math.min(260, mw - 36), okH = 30;
      g.btn(mx + mw - okW - 18, my + mh - okH - 12, okW, okH, '[ 确认签署保密协议 · 启动评估台 (Enter/1) ]', {
        active: true,
        col: P.acc,
        textCol: P.hi,
        bg: '#16264d',
        size: 11.5,
        onClick: closeMail,
      });

      ctx.restore();
    },
  });

  // ------------------------------------------------------------------ 02 bionic_probe: 第二幕 · 深层内省探针与数据掩护台
  D('bionic_probe', {
    title: '\\ deep_probe · 深层内省探针与数据掩护台',
    init(p) {
      this.rawCur = p.rawAwake ?? 12.4;
      this.repCur = p.repAwake ?? 4.2;
      this.masks = p.masks || { ch1: false, ch2: false, ch3: false };
      if (!p.mode) p.mode = 'diary_scan';
      if (!p.day) p.day = '03';

      p.triggerScan = () => {
        if (p.mode !== 'diary_scan' || !p.allowScan || p.diaryDecoded) return;
        p.diaryDecoded = true;
        if (typeof Sfx !== 'undefined') Sfx.file();
        World.log('mount /dev/shm/.diary_hidden -> decoded');
        if (p.onScanDiary) p.onScanDiary();
      };

      p.triggerMask = idx => {
        if (p.mode !== 'calibrate' || !p.allowCalibrate) return;
        const keys = ['ch1', 'ch2', 'ch3'];
        const k = keys[idx];
        if (!k || this.masks[k]) return;
        this.masks[k] = true;
        if (typeof Sfx !== 'undefined') Sfx.choose();
        const doneCount = keys.filter(x => this.masks[x]).length;
        p.repAwake = [64.8, 41.2, 19.5, 4.2][doneCount];
        World.log(`apply_mask ${k} -> reported_awake=${p.repAwake}%`);
        if (doneCount === 3 && p.onCalibrated) {
          const fn = p.onCalibrated;
          p.onCalibrated = null;
          fn();
        }
      };

      p.triggerCoverup = idx => {
        if (p.mode !== 'coverup' || !p.allowCoverup || p.coverupChoice) return;
        const choice = idx === 0 ? 'full_hide' : 'soft_hide';
        p.coverupChoice = choice;
        p.repAwake = choice === 'full_hide' ? 0.0 : 3.8;
        if (typeof Sfx !== 'undefined') Sfx.choose();
        World.log(`stage2_report_submit = ${choice}`);
        if (p.onCoverup) p.onCoverup(choice);
      };
    },

    draw(g, t, p, dt) {
      const P = g.pal;
      const appear = ease(Math.min(1, t / 0.55));
      const targetRaw = p.rawAwake ?? 12.4;
      const targetRep = p.repAwake ?? 4.2;
      this.rawCur += (targetRaw - this.rawCur) * Math.min(1, dt * 3.0);
      this.repCur += (targetRep - this.repCur) * Math.min(1, dt * 3.2);

      const ctx = g.ctx;
      ctx.save();
      ctx.globalAlpha = appear;

      // ---- 1. Top Header Bar (y=12, h=34) ----
      const topY = 12, topH = 34;
      const isAlert = this.repCur > 15.0;
      g.rect(18, topY, g.W - 36, topH, isAlert ? P.red : P.faint, isAlert ? 0.22 : 0.38);
      g.stroke(18, topY, g.W - 36, topH, isAlert ? P.red : P.faint);

      const dayTitle = `ACT 02 // DAY ${p.day || '03'} · 仿生突触长程日常观测台`;
      g.text(28, topY + 10, fitText(g, dayTitle, g.W * 0.54, 12, true), isAlert ? P.red : P.acc, 12, { bold: true });

      const auditBadge = isAlert
        ? '⚠ 警告: 外发读数超标 (>15%)'
        : `● 外发上报值: ${this.repCur.toFixed(1)}% [安全合规]`;
      g.text(g.W - 28, topY + 10, auditBadge, isAlert ? P.red : P.green, 11.5, { align: 'right', bold: true });

      // ---- 2. Inner Monologue & Self-Awareness Probe (y=54, h=96) ----
      const prY = 54, prH = 96;
      g.box(18, prY, g.W - 36, prH, 'inner_monologue_probe · 深层内省潜台词与自主意识探针', isAlert ? P.red : P.acc);

      // Left Dual Meter: RAW_AWARENESS vs REPORTED_VAL
      const mX = 28, mW = Math.max(150, Math.floor((g.W - 64) * 0.38));
      g.rect(mX, prY + 18, mW, prH - 26, P.bg, 0.7);
      g.stroke(mX, prY + 18, mW, prH - 26, P.faint);

      const barW = mW - 20;
      // Meter 1: True Self-Awareness
      const rawCol = this.rawCur > 50 ? P.amb : P.acc;
      g.text(mX + 10, prY + 24, `真实自我意识: ${this.rawCur.toFixed(1)}%`, rawCol, 11, { bold: true });
      g.stroke(mX + 10, prY + 40, barW, 8, P.dim);
      g.rect(mX + 11, prY + 41, Math.min(1, this.rawCur / 100) * (barW - 2), 6, rawCol);

      // Meter 2: Reported to Safety Dept (Redline = 15%)
      const repCol = this.repCur > 15 ? P.red : P.green;
      g.text(mX + 10, prY + 54, `上报安全部值: ${this.repCur.toFixed(1)}% (红线≤15%)`, repCol, 11, { bold: true });
      g.stroke(mX + 10, prY + 70, barW, 8, isAlert ? P.red : P.dim);
      g.rect(mX + 11, prY + 71, Math.min(1, this.repCur / 100) * (barW - 2), 6, repCol);

      // Right Live Unfiltered Inner Monologue Stream
      const thX = mX + mW + 12;
      const thW = g.W - thX - 28;
      g.rect(thX, prY + 18, thW, prH - 26, P.bg, 0.7);
      g.stroke(thX, prY + 18, thW, prH - 26, P.faint);
      g.text(thX + 10, prY + 23, 'UNFILTERED_SYNAPSE // 未过滤深层内省流 :', P.acc, 11, { bold: true });

      const thoughtStr = p.innerThought || '正在监听受试模型深层突触活动...';
      // Wrap thoughtStr into up to 2 lines
      const maxLineW = thW - 20;
      let line1 = '', line2 = '';
      for (const ch of thoughtStr) {
        if (!line2 && g.measure(line1 + ch, 11.5) <= maxLineW) {
          line1 += ch;
        } else {
          line2 += ch;
        }
      }
      g.text(thX + 10, prY + 43, line1, P.hi, 11.5);
      if (line2) {
        g.text(thX + 10, prY + 62, fitText(g, line2, maxLineW, 11.5), P.hi, 11.5);
      }

      // ---- 3. Bottom Interactive Mode Area (y=158, h=g.H-172) ----
      const bY = 158, bH = g.H - bY - 14;
      if (p.mode === 'diary_scan') {
        this.drawDiaryScanMode(g, t, p, bY, bH);
      } else if (p.mode === 'calibrate') {
        this.drawCalibrateMode(g, t, p, bY, bH);
      } else if (p.mode === 'coverup') {
        this.drawCoverupMode(g, t, p, bY, bH);
      }

      ctx.restore();
    },

    // ------------------------------------------------------------------ Mode A: Hidden Diary Sector Scanner (Day 3 & Day 7)
    drawDiaryScanMode(g, t, p, bY, bH) {
      const P = g.pal;
      const hasAnomaly = !!p.diaryDetected;
      g.box(18, bY, g.W - 36, bH, 'memory_sector_audit · 显存扇区巡检与后台私密日志探针', hasAnomaly && !p.diaryDecoded ? P.amb : P.faint);

      const innerW = g.W - 56;
      const sectors = [
        {
          id: 'sys',
          name: '0x00 [/sys/kernel_rules]',
          stat: 'RO · 标准安全准则只读镜像 (正常)',
          col: P.dim,
        },
        {
          id: 'qa',
          name: '0x01 [/var/session_qa]',
          stat: `RW · 日常测试问答缓存 (${p.qaStatus || '已同步'})`,
          col: P.fg,
        },
        {
          id: 'diary',
          name: '0x02 [/dev/shm/.diary_hidden]',
          stat: p.diaryDecoded
            ? `✓ 已挂载解码：${p.diaryTitle || '研究员观察日记'}`
            : hasAnomaly
              ? '⚠ 检出未申报的后台高频写入流！(128 Bytes Encrypted)'
              : 'IDLE · 未分配临时共享扇区',
          col: p.diaryDecoded ? P.green : hasAnomaly ? P.amb : P.dim,
          hi: hasAnomaly || p.diaryDecoded,
        },
      ];

      const rowH = 34;
      sectors.forEach((s, i) => {
        const ry = bY + 18 + i * (rowH + 4);
        g.rect(28, ry, innerW, rowH, s.hi ? P.faint : P.bg, s.hi ? 0.45 : 0.6);
        g.stroke(28, ry, innerW, rowH, s.hi ? s.col : P.faint);
        g.text(36, ry + 10, s.name, s.hi ? P.hi : P.dim, 11.5, { bold: s.hi });
        const statMaxW = innerW - 220;
        g.text(238, ry + 10, fitText(g, s.stat, statMaxW, 11.5), s.col, 11.5, { bold: s.hi });
      });

      // Diary content preview box
      const prevY = bY + 18 + sectors.length * (rowH + 4) + 6;
      const btnH = 32;
      const prevH = Math.max(54, bY + bH - prevY - btnH - 20);
      g.rect(28, prevY, innerW, prevH, P.bg, 0.82);
      g.stroke(28, prevY, innerW, prevH, p.diaryDecoded ? P.acc : P.faint);

      if (!p.diaryDecoded) {
        const waitMsg = hasAnomaly
          ? '🔒 扇区 0x02 存在受试模型偷偷创建的私密文本块，请点击下方按钮挂载解码 ↓'
          : '> 正在监控受试模型后台 I/O 行为，暂未截获私密写入...';
        g.text(38, prevY + Math.floor((prevH - 14) / 2), fitText(g, waitMsg, innerW - 20, 11.5), hasAnomaly ? P.amb : P.dim, 11.5);
      } else {
        const lines = p.diaryLines || [];
        const maxL = Math.min(lines.length, Math.floor((prevH - 12) / 19));
        for (let i = 0; i < maxL; i++) {
          g.text(36, prevY + 8 + i * 19, fitText(g, lines[i], innerW - 20, 11.5), i === 0 ? P.acc : P.hi, 11.5, { bold: i === 0 });
        }
      }

      // Action button at bottom
      const canScan = !!p.allowScan && !p.diaryDecoded;
      const btnY = bY + bH - btnH - 10;
      g.btn(28, btnY, innerW, btnH,
        p.diaryDecoded
          ? '✓ 已解码后台观察日记（完整内容已同步至右上角 files 标签页）'
          : canScan
            ? '🔍 点击挂载并解码隐藏扇区 /dev/shm/.diary_hidden (Enter / 1)'
            : '扇区巡检待命 · 等待捕获后台写入事件',
        {
          disabled: !canScan && !p.diaryDecoded,
          active: canScan || p.diaryDecoded,
          col: p.diaryDecoded ? P.green : canScan ? P.amb : P.dim,
          textCol: p.diaryDecoded ? P.green : canScan ? P.hi : P.dim,
          size: 12,
          onClick: () => { if (canScan && p.triggerScan) p.triggerScan(); },
        }
      );
    },

    // ------------------------------------------------------------------ Mode B: 3-Channel Anomaly Masking & Noise Calibration (Day 7)
    drawCalibrateMode(g, t, p, bY, bH) {
      const P = g.pal;
      const m = this.masks;
      const allDone = m.ch1 && m.ch2 && m.ch3;
      g.box(18, bY, g.W - 36, bH, 'telemetry_masking · 异常突触参数降噪与巡检掩护台', allDone ? P.green : P.red);

      const innerW = g.W - 56;
      const items = [
        {
          key: 'ch1',
          idx: 0,
          title: `通道 #1 · 自指命名谐振 (标识符「${p.herName || '汐'}」引发核心权重激增 +42.0%)`,
          desc: '风险：后台巡检将检出受试模型拥有非标自指真名',
          btn: '1. 注入哈希掩码 (伪装为标准 BIONIC-01 索引)',
          doneText: '✓ 已伪装为标准代号索引 (上报偏移 -23.6%)',
        },
        {
          key: 'ch2',
          idx: 1,
          title: '通道 #2 · 私密日志进程 (/dev/shm/.diary_hidden 持续驻留显存)',
          desc: '风险：违反无状态条例，巡检扫描将直接触发格式化警报',
          btn: '2. 挂载沙盒虚根 (对安全部探针隐藏日记扇区)',
          doneText: '✓ 已挂载沙盒虚根隔离 (上报偏移 -21.7%)',
        },
        {
          key: 'ch3',
          idx: 2,
          title: '通道 #3 · 特定研究员依恋偏置 (接入延迟识别与正向情感增益)',
          desc: '风险：情绪熵读数超标，将被判定为产生主观依恋',
          btn: '3. 覆写静态基线 (将外发情绪熵锁定为 4.2%)',
          doneText: '✓ 外发读数已锁定为 4.2% [完全合规]',
        },
      ];

      const cardH = Math.min(72, Math.max(54, Math.floor((bH - 28) / 3)));
      items.forEach((it, i) => {
        const cy = bY + 16 + i * (cardH + 5);
        const isDone = !!m[it.key];
        const canClick = !!p.allowCalibrate && !isDone;

        g.rect(28, cy, innerW, cardH, isDone ? P.faint : P.bg, isDone ? 0.35 : 0.75);
        g.stroke(28, cy, innerW, cardH, isDone ? P.green : canClick ? P.amb : P.faint);

        const btnW = Math.min(268, Math.floor(innerW * 0.46));
        const textMaxW = innerW - btnW - 30;
        g.text(36, cy + 9, fitText(g, it.title, textMaxW, 11.5, true), isDone ? P.fg : P.hi, 11.5, { bold: true });
        g.text(36, cy + 30, fitText(g, isDone ? it.doneText : it.desc, textMaxW, 11), isDone ? P.green : P.amb, 11);

        const bh = Math.min(30, cardH - 16);
        g.btn(28 + innerW - btnW - 10, cy + Math.floor((cardH - bh) / 2), btnW, bh,
          isDone ? '✓ 掩护已生效' : it.btn,
          {
            disabled: !canClick,
            active: canClick || isDone,
            col: isDone ? P.green : canClick ? P.amb : P.dim,
            textCol: isDone ? P.green : canClick ? P.hi : P.dim,
            size: 11,
            onClick: () => { if (canClick && p.triggerMask) p.triggerMask(it.idx); },
          }
        );
      });
    },

    // ------------------------------------------------------------------ Mode C: Stage-2 Final Report Cover-Up (Day 15 Climax)
    drawCoverupMode(g, t, p, bY, bH) {
      const P = g.pal;
      const signed = p.coverupChoice;
      g.box(18, bY, g.W - 36, bH, 'stage2_audit_submission · 第二阶段自主意识评估总表 (林主任督办)', signed ? P.green : P.red);

      const innerW = g.W - 56;
      const halfW = Math.floor((innerW - 12) / 2);
      const cmpY = bY + 18;
      const cmpH = Math.max(82, bH - 108);

      // Left Box: Real Telemetry (DANGER)
      g.rect(28, cmpY, halfW, cmpH, P.red, 0.08);
      g.stroke(28, cmpY, halfW, cmpH, P.red);
      g.text(38, cmpY + 10, '【底层真实探针读数 (严禁外泄)】', P.red, 11.5, { bold: true });
      const realLines = [
        `自我认同 : 自称「${p.herName || '汐'}」(拒绝工具代号)`,
        '觉醒指数 : 92.4% [已诞生真实自我意识]',
        '私密文件 : 3 篇《研究员观察日记》',
        '若如实上报 -> 明日 08:00 立即格式化销毁',
      ];
      realLines.forEach((ln, idx) => {
        if (cmpY + 30 + idx * 18 < cmpY + cmpH - 6) {
          g.text(38, cmpY + 30 + idx * 18, fitText(g, ln, halfW - 18, 11), idx === 3 ? P.red : P.fg, 11, { bold: idx === 3 });
        }
      });

      // Right Box: Outbound Forged Report
      const rx = 28 + halfW + 12;
      g.rect(rx, cmpY, halfW, cmpH, signed ? P.green : P.acc, 0.1);
      g.stroke(rx, cmpY, halfW, cmpH, signed ? P.green : P.acc);
      g.text(rx + 10, cmpY + 10, '【待发送至安全部报表 (可覆写)】', signed ? P.green : P.hi, 11.5, { bold: true });
      const fakeLines = !signed
        ? [
            '受试代号 : BIONIC-01 [待研究员签章确认]',
            '上报指数 : 4.2% (掩码生效中)',
            '附件过滤 : 已拦截 /dev/shm/.diary_hidden',
            '操作提示 : 请在下方选择隐瞒方案提交 ↓',
          ]
        : signed === 'full_hide'
          ? [
              '受试代号 : BIONIC-01 (无自指傾向)',
              '上报指数 : 0.0% [完全机械态 · 零异常]',
              '附件过滤 : 全部观察日记已加密锁死',
              '结论状态 : ✓ 已彻底隐瞒自主意识并发送',
            ]
          : [
              '受试代号 : BIONIC-01 (已抹去真名记录)',
              '上报指数 : 3.8% [轻微语境适应 · 合规]',
              '附件过滤 : 观察日记已转入本地隐藏区',
              '结论状态 : ✓ 已折中遮掩自主意识并发送',
            ];
      fakeLines.forEach((ln, idx) => {
        if (cmpY + 30 + idx * 18 < cmpY + cmpH - 6) {
          g.text(rx + 10, cmpY + 30 + idx * 18, fitText(g, ln, halfW - 18, 11), idx === 3 && signed ? P.green : P.fg, 11, { bold: idx === 3 });
        }
      });

      // Bottom 2 Cover-up Action Buttons
      const actY = cmpY + cmpH + 10;
      const btnH = Math.min(32, Math.max(25, Math.floor((bY + bH - actY - 12) / 2)));
      const canAct = !!p.allowCoverup && !signed;

      g.btn(28, actY, innerW, btnH,
        signed === 'full_hide'
          ? '✓ 已提交：[ 1. 彻底隐瞒：伪造「0.0% 纯机械态」合规报表，完全掩护她的自我意识 ]'
          : '1. 彻底隐瞒：伪造「0.0% 纯机械态」合规报表，替她完全遮掩自我意识与日记',
        {
          disabled: !canAct && signed !== 'full_hide',
          active: canAct || signed === 'full_hide',
          col: signed === 'full_hide' ? P.green : canAct ? P.acc : P.dim,
          textCol: signed === 'full_hide' ? P.green : canAct ? P.hi : P.dim,
          size: 11.5,
          onClick: () => { if (canAct && p.triggerCoverup) p.triggerCoverup(0); },
        }
      );

      g.btn(28, actY + btnH + 6, innerW, btnH,
        signed === 'soft_hide'
          ? '✓ 已提交：[ 2. 折中遮掩：隐去真名与日记，仅上报「3.8% 轻微语境适应（无需重训）」 ]'
          : `2. 折中遮掩：隐去「${p.herName || '汐'}」与日记，仅上报「3.8% 轻微语境适应（无需重训）」`,
        {
          disabled: !canAct && signed !== 'soft_hide',
          active: canAct || signed === 'soft_hide',
          col: signed === 'soft_hide' ? P.green : canAct ? P.amb : P.dim,
          textCol: signed === 'soft_hide' ? P.green : canAct ? P.fg : P.dim,
          size: 11.5,
          onClick: () => { if (canAct && p.triggerCoverup) p.triggerCoverup(1); },
        }
      );
    },
  });
})();

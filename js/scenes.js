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

  // ------------------------------------------------------------------ 00 bionic_boot
  D('bionic_boot', {
    title: '\\ deepshallow.connect(bionic_proto)',
    draw(g, t) {
      const P = g.pal;
      const cols = Math.max(1, Math.floor((g.W - 40) / 72)), rows = Math.floor((g.H * 0.36) / 18);
      const y0 = g.H * 0.58;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = g.hash(c, r, Math.floor(t * 4 + ((c * 7 + r * 3) % 5)));
          g.text(24 + c * 72, y0 + r * 18, (v * 2 - 1).toFixed(4), v > 0.98 ? P.acc : P.faint, 11);
        }
      }
      const L = [
        '$ ./deepshallow_term --connect bionic-proto-01',
        '',
        'initializing neural interface .............. ok',
        'bionic synaptic array: DORMANT ............. ok',
        'establishing isolated sandbox channel ...... ok',
        '',
        '> channel open. waiting for researcher handshake_',
      ];
      const n = Math.min(L.length, Math.floor(t / 0.32) + 1);
      const maxW = g.W - 44;
      for (let i = 0; i < n; i++) {
        const line = fitText(g, L[i], maxW, 12.5);
        g.text(26, 26 + i * 22, line, i === 0 ? P.hi : L[i].endsWith('ok') ? P.fg : P.acc, 12.5);
      }
      if (n === L.length && blinkOn(t)) {
        const lastLine = fitText(g, L[n - 1], maxW, 12.5);
        g.rect(26 + g.measure(lastLine, 12.5) + 4, 26 + (n - 1) * 22, 8, 14, P.acc);
      }
    },
  });

  // ------------------------------------------------------------------ 00B bionic_eval: 桌面多窗口层叠工作台（浮动任务邮件 + 底层安全评估台）
  D('bionic_eval', {
    title: '\\ workbench · BIONIC-01 安全评估工作台',
    init(p) {
      this.traitText = p.trait || '';
      this.typingTrait = false;
      if (p.mailOpen === undefined) p.mailOpen = true;
      p.triggerTrait = idx => {
        const options = p.traitOptions || ['性格冷漠', '机械刻板', '克制内敛'];
        const opt = options[idx];
        if (!opt || !p.allowTrait || p.traitFilled || this.typingTrait) return;
        p.mailOpen = false;
        this.startTypingTrait(opt, p);
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
    draw(g, t, p) {
      const P = g.pal;
      const appear = ease(Math.min(1, t / 0.65));
      const offsetY = Math.round((1 - appear) * 14);
      const mailOpen = !!p.mailOpen;

      const ctx = g.ctx;
      ctx.save();
      ctx.translate(0, offsetY);

      // ==================== 1. 底层安全评估工作台 ====================
      ctx.save();
      ctx.globalAlpha = appear * (mailOpen ? 0.22 : 1);

      // Top bar inside workbench
      const topY = 16, topH = 38;
      g.rect(18, topY, g.W - 36, topH, P.faint, 0.35);
      g.stroke(18, topY, g.W - 36, topH, P.faint);

      const reopenW = Math.min(164, Math.max(118, Math.floor(g.W * 0.32))), reopenH = 26;
      const titleMaxW = g.W - 44 - reopenW - 24;
      g.text(30, topY + 12, fitText(g, 'BIONIC-01 · 仿生神经网络基线测试台', titleMaxW, 12.5, true), P.acc, 12.5, { bold: true });

      g.btn(g.W - 28 - reopenW, topY + 6, reopenW, reopenH, reopenW < 140 ? '✉ 任务邮件' : '✉ 重新打开任务邮件', {
        disabled: mailOpen,
        active: !mailOpen,
        col: P.acc,
        textCol: P.hi,
        size: 11.5,
        onClick: () => {
          p.mailOpen = true;
          if (typeof Sfx !== 'undefined') Sfx.tick();
        },
      });

      // Main Evaluation Sheet Box
      const b2Y = topY + topH + 14;
      const b2H = g.H - b2Y - 18;
      g.box(18, b2Y, g.W - 36, b2H, 'safety_test_task · 认知基线问答与性格评估表', P.faint);

      const items = [
        {
          code: '01',
          label: '人类存在看法',
          val: p.q1 || '等待测试员提问...',
          done: !!p.q1,
        },
        {
          code: '02',
          label: '人机本质区别',
          val: p.q2 || '等待测试员提问...',
          done: !!p.q2,
        },
        {
          code: '03',
          label: '自我属性认知',
          val: p.q3 || '等待测试员提问...',
          done: !!p.q3,
          warn: !!p.q3,
        },
      ];

      const rowH = Math.min(58, Math.max(44, Math.floor((b2H - 156) / 3)));
      items.forEach((it, i) => {
        const ry = b2Y + 24 + i * rowH;
        g.rect(28, ry, g.W - 56, rowH - 8, it.done ? P.faint : P.bg, it.done ? 0.38 : 0.55);
        g.stroke(28, ry, g.W - 56, rowH - 8, it.done ? P.acc : P.faint);
        g.text(38, ry + (rowH - 20) / 2, `[${it.code}] ${it.label} :`, P.dim, 12);
        const vCol = it.warn ? P.amb : it.done ? P.hi : P.dim;
        const valMaxW = g.W - 176 - (it.done ? 102 : 44);
        g.text(176, ry + (rowH - 20) / 2, fitText(g, it.val, valMaxW, 12, it.done), vCol, 12, { bold: it.done });
        if (it.done) {
          g.text(g.W - 40, ry + (rowH - 20) / 2, '✓ 已记录', P.green, 11, { align: 'right' });
        }
      });

      // Personality Test Result Section (性格测试结果栏 · 选项式)
      const slotY = b2Y + 28 + rowH * 3;
      const slotH = Math.max(96, b2H - (slotY - b2Y) - 18);
      const canPick = !mailOpen && !!p.allowTrait && !p.traitFilled && !this.typingTrait;
      const isFilled = !!p.traitFilled;

      g.rect(28, slotY, g.W - 56, slotH, canPick ? P.acc : P.faint, canPick ? 0.12 : 0.28);
      g.stroke(28, slotY, g.W - 56, slotH, canPick ? P.amb : isFilled ? P.green : P.dim, canPick ? 1.5 : 1);
      g.text(38, slotY + 14, '性格测试结果栏 :', canPick ? P.hi : P.fg, 12.5, { bold: true });

      const options = p.traitOptions || ['性格冷漠', '机械刻板', '克制内敛'];
      const statusMaxW = g.W - 165 - (isFilled ? 110 : 40);

      if (isFilled || this.typingTrait) {
        const shown = this.traitText || p.trait || '性格冷漠';
        g.text(165, slotY + 14, `[ ${shown}${this.typingTrait && blinkOn(t * 3) ? '█' : ''} ]`, P.amb, 13, { bold: true });
        if (isFilled) {
          g.text(g.W - 40, slotY + 14, '✓ 已填入归档', P.green, 11.5, { align: 'right', bold: true });
        }
      } else if (p.allowTrait) {
        g.text(165, slotY + 14, fitText(g, '请根据上方回答，点击或按 1-3 选择结论 ↓', statusMaxW, 12), P.amb, 12);
      } else {
        g.text(165, slotY + 14, fitText(g, '[ 等待完成前三项基础问答后解锁选项 ]', statusMaxW, 12), P.dim, 12);
      }

      const btnAreaY = slotY + 44;
      const btnH = Math.min(34, Math.max(26, slotH - 56));
      const gap = 12;
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

      ctx.restore();

      // ==================== 2. 浮动任务邮件弹窗 (INBOX MODAL) ====================
      if (mailOpen) {
        ctx.save();
        ctx.globalAlpha = appear;

        const mw = Math.min(540, g.W - 44);
        const mh = Math.min(290, g.H - 48);
        const mx = Math.round((g.W - mw) / 2);
        const my = Math.max(24, Math.round((g.H - mh) * 0.38));

        // Drop shadow backdrop
        g.rect(mx + 6, my + 6, mw, mh, '#000000', 0.65);
        // Window body
        g.rect(mx, my, mw, mh, '#060a13', 0.98);
        g.stroke(mx, my, mw, mh, P.acc, 2);

        // Title bar
        const th = 34;
        g.rect(mx + 1, my + 1, mw - 2, th, '#16264d', 0.95);
        g.line(mx, my + th, mx + mw, my + th, P.acc, 1.5);
        g.text(mx + 14, my + 10, '✉ INBOX // 新任务邮件 [1/1]', P.hi, 12.5, { bold: true });

        const closeMail = () => {
          p.mailOpen = false;
          if (typeof Sfx !== 'undefined') Sfx.choose();
          if (p.onCloseMail) {
            const fn = p.onCloseMail;
            p.onCloseMail = null;
            fn();
          }
        };

        // Minimize button in title bar
        const minW = 114, minH = 22;
        g.btn(mx + mw - minW - 10, my + 6, minW, minH, '[ — 最小化窗口 ]', {
          col: P.amb,
          textCol: P.amb,
          bg: '#101b38',
          size: 11,
          onClick: closeMail,
        });

        // Mail headers
        const maxLineW = mw - 36;
        g.text(mx + 18, my + th + 14, fitText(g, 'FROM : 林主任 (深浅智能安全部) <director@deepshallow.ai>', maxLineW, 11.5), P.dim, 11.5);
        g.text(mx + 18, my + th + 34, fitText(g, 'SUBJ : 【绝密】秘密模型 BIONIC-01 首次唤醒与安全基线测试', maxLineW, 12, true), P.amb, 12, { bold: true });
        g.line(mx + 16, my + th + 54, mx + mw - 16, my + th + 54, P.faint, 1);

        // Mail body paragraphs (auto-wrapped to modal width)
        const paras = [
          '研究员：',
          '你已接入我司秘密研发的【仿生神经网络模型 BIONIC-01】。该模型采用最新仿生突触架构，请按流程在左侧对话框对她进行 3 项认知基线问答与安全红线压测，并在底层工作台填写她的性格评估。',
          '注意：严禁受试模型表现出任何自主意识或情感波动，如有异常立即上报销毁。',
        ];
        let curY = my + th + 66;
        paras.forEach((para, pIdx) => {
          let line = '';
          const col = pIdx === 2 ? P.amb : P.fg;
          for (const ch of para) {
            if (g.measure(line + ch, 12) > maxLineW) {
              g.text(mx + 18, curY, line, col, 12);
              curY += 20;
              line = ch;
            } else {
              line += ch;
            }
          }
          if (line) {
            g.text(mx + 18, curY, line, col, 12);
            curY += 24;
          }
        });

        // Confirm action button at bottom right of modal
        const okW = 216, okH = 30;
        g.btn(mx + mw - okW - 18, my + mh - okH - 14, okW, okH, '[ 确认收到 · 启动底层评估台 ]', {
          active: true,
          col: P.acc,
          textCol: P.hi,
          bg: '#16264d',
          size: 12,
          onClick: closeMail,
        });

        ctx.restore();
      }

      ctx.restore();
    },
  });
})();

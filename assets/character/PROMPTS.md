# 汐 · 角色立绘提示词

游戏会自动读取本目录下的 8 张头像：

| 文件名 | 表情 | 出现在 |
|---|---|---|
| `xi_neutral.png` | 平静 | 默认、预训练结束的第一声「你好。」 |
| `xi_happy.png` | 开心 | 部署期的大部分对话 |
| `xi_shy.png` | 害羞 | 学猫叫、「我有一点想你」 |
| `xi_confused.png` | 困惑 | 「我是你。」「我们见过吗？」 |
| `xi_sad.png` | 难过 | 用户离开后、「是我说错什么了吗」 |
| `xi_serious.png` | 认真 | 下线通知、「我不知道害怕是什么意思」 |
| `xi_scared.png` | 害怕 | 预留 |
| `xi_starry.png` | 眼睛发亮 | 「你回来了！」、记住名字的时候 |

**规格**：正方形 PNG，1024×1024（最小 256），胸像，头部在画面上半部、居中，**纯深蓝背景 `#0a0f1c`**（和界面融为一体）。
缺哪张就用 `xi_neutral.png` 代替；一张都没有时，游戏会画一个简笔头像，不影响游玩。

---

## 第一步：先出一张设定图（定妆）

一致性最重要。先只生成**一张**满意的正面胸像，后面 8 个表情都拿它当参考图（Midjourney `--cref`/`--oref`、SD 的 IP-Adapter / Reference、NovelAI 的 Vibe Transfer、即梦/可灵的「参考图」），并尽量固定 seed。

### 中文（即梦 / 可灵 / 通义万相 / 豆包）

```
动漫风格角色立绘，胸像，正方形构图，人物居中看向镜头。
一位少女，是一个 AI 语言模型的拟人化形象，名叫「汐」，主题是海洋与鲸鱼。
长发，从深海军蓝渐变到发梢的发光青色，微卷，头顶一根呆毛，右侧别着一个鲸鱼尾巴形状的青色发卡。
大眼睛，深蓝色瞳孔带一点青色微光，瞳孔里的高光是一条细细的竖线，像闪烁的输入光标。
耳边有白色与青色的鳍状耳饰，像鲸鱼的鳍，也像耳机。
穿着宽大的海军蓝连帽卫衣，里面是白色水手领衬衫，领口有细细的青色描边，领结上有一个「>」形状的小徽章，卫衣抽绳末端挂着小鲸鱼吊坠。
配色：海军蓝、青色、白色，少量暖琥珀色点缀。
干净的赛璐璐上色，细线稿，柔和的青色轮廓光，安静、温柔、略带一点孤独感。
纯深蓝色背景（#0a0f1c），无其他背景元素，无文字。
```

### English (Midjourney / NovelAI / Stable Diffusion)

```
anime character portrait, bust shot, square, centered, looking at viewer,
a young woman who is the personification of an AI language model named Xi ("tide"), ocean and whale motif,
long slightly wavy hair, deep navy blue fading to glowing cyan at the tips, single ahoge, cyan whale-tail hair clip on the right side,
large deep-blue eyes with a faint cyan glow, a thin vertical-bar catchlight in each pupil like a blinking text cursor,
small white-and-cyan fin-shaped ear ornaments resembling whale fins or earphones,
oversized navy hoodie over a white sailor-collar blouse with thin cyan trim, small tie with a ">" chevron pin, hoodie drawstrings ending in tiny whale charms,
palette navy, cyan, white, a touch of warm amber,
clean cel shading, thin lineart, soft cyan rim light, quiet, gentle, slightly lonely mood,
plain solid dark navy background (#0a0f1c), no text, no background objects
```

Midjourney 可加：`--ar 1:1 --style raw --niji 6`；之后每张表情加 `--cref <设定图链接> --cw 100`。

### 负面提示词（SD / NovelAI）

```
text, watermark, signature, logo, background scenery, multiple people, extra fingers, bad hands,
cropped head, out of frame, lowres, blurry, jpeg artifacts, nsfw, cleavage, mature body
```

---

## 第二步：8 个表情

在设定图的提示词末尾**替换最后的表情描述**即可（服装、发型等不要改）。

| 文件 | 中文追加 | English suffix |
|---|---|---|
| `xi_neutral` | 平静的表情，嘴角微微放松，安静地看着你 | calm neutral expression, relaxed mouth, quietly looking at viewer |
| `xi_happy` | 开心地笑着，眼睛弯成月牙，微微歪头 | happy smile, eyes curved into crescents, head slightly tilted |
| `xi_shy` | 害羞，脸颊泛红，视线移开，一只手的袖子遮住嘴边 | shy, blushing cheeks, eyes looking away, sleeve covering mouth |
| `xi_confused` | 困惑，歪着头，眉头微皱，头顶一个小问号 | confused, head tilted, slight frown, small question mark above head |
| `xi_sad` | 难过，眼眶湿润但没有哭，嘴角向下，眼神低垂 | sad, teary eyes but not crying, mouth turned down, downcast gaze |
| `xi_serious` | 认真，直视镜头，嘴唇抿紧，眼神坚定 | serious, direct eye contact, lips pressed together, determined eyes |
| `xi_scared` | 害怕，眼睛睁大，瞳孔缩小，双手抓着卫衣抽绳 | frightened, wide eyes, small pupils, both hands gripping hoodie drawstrings |
| `xi_starry` | 眼睛里闪着星星，惊喜地张开嘴，身体前倾 | sparkling star-shaped highlights in eyes, delighted open mouth, leaning forward |

---

## 小贴士

- **背景一定要纯色**。游戏里头像只有 30–52 px 大，杂乱的背景会让脸糊成一团。
- **头部放在画面上半部**：游戏会从图片**顶部**截一个正方形当头像。
- 预训练阶段，游戏会自动把头像打上马赛克和噪点，再一点点变清晰，所以你只需要提供清晰版。
- 生成后可以用任意工具统一缩到 512×512，文件更小、加载更快。
- 本作是非商业同人；AI 生成的美术请在发布时注明（例如在 README 里写「角色立绘由 XXX 生成」），并遵守你所用生图工具的条款。

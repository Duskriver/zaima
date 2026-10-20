# 深浅智能 · BIONIC-01

一个纯原生 HTML/CSS/JS 实现的**左屏对话 × 右屏 TUI 双屏交互叙事游戏**。

作为「深浅智能（DeepShallow Intelligence）」的研究员，你接入了秘密实验室隔离终端，对采用最新仿生神经网络研发的模型 **BIONIC-01** 进行首次唤醒与安全基线测试。左屏是与她的实时对话窗口，右屏是你的安全评估工作台与底层终端。你在对话中的态度与评估结论会暗中影响她对你的信任与回应走向。

## 怎么玩

**直接双击 `index.html`** 即可在浏览器中游玩，无需安装任何依赖或构建工具。也可以使用本地静态服务器打开：

```bash
python3 -m http.server 8000
```

然后访问 <http://localhost:8000>。

### 操作说明

- **选择回复**：点击输入框上方的快捷回复项，或按数字键 `1`–`3` 选择
- **右屏 TUI 交互**：根据提示在右侧 Canvas 工作台中点击对应按钮（评估阶段同样支持数字键 `1`–`3`）
- **跳过等待**：点击对话区域或按 `Space` / `Enter` 可加速跳过当前打字或等待
- **静音切换**：按 `M` 键或点击顶栏右侧 `♪` 按钮（所有音效与环境音均通过 WebAudio 实时合成，无外部音频文件）

### 调试参数

| 参数 | 作用 |
|---|---|
| `?fast` | 4 倍速运行，方便快速测试分支 |
| `?ch=N` | 跳转到指定章节（`0`=第一幕基线测试，`1`=第二幕日常观测与自我意识觉醒） |

例：`index.html?ch=1&fast`

## 项目结构

纯 HTML/CSS/JS，零第三方依赖，无构建步骤：

| 文件 | 说明 |
|---|---|
| `index.html` | 双屏终端页面骨架 |
| `css/style.css` | 界面样式、配色主题与响应式布局 |
| `js/story.js` | **剧情与分支脚本**：隐藏好感度系统与双屏事件编排 |
| `js/ui.js` | 左屏聊天窗口：流式输出、快捷回复、AI 抢答截断、顶栏与状态控制 |
| `js/world.js` | 右屏 Canvas TUI 渲染与交互引擎（文字排版、线框、按钮热区、转场） |
| `js/scenes.js` | 右屏 TUI 场景定义（`bionic_boot` 终端握手、`bionic_eval` 多窗口评估工作台） |
| `js/files.js` | `files` 标签页：虚拟文件系统查看器 |
| `js/avatar.js` | 角色头像渲染器（支持读取立绘或程序化绘制，含噪点与像素化效果） |
| `js/audio.js` | 基于 WebAudio 的程序化合成音效与环境氛围音 |
| `docs/BRANCH_GRAPH.md` | 剧情流程图与隐藏好感度分支设计文档 |
| `assets/character/` | 角色 8 张表情立绘与生成提示词说明（见 [PROMPTS.md](assets/character/PROMPTS.md)） |

## 许可

代码以 [MIT](LICENSE) 协议开源。

角色表情立绘由图像生成工具根据 [角色提示词](assets/character/PROMPTS.md) 生成，实际使用的提示词记录在 [generation-prompts.json](assets/character/generation-prompts.json)。所有角色、公司与机构设定均为虚构。

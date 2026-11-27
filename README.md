# MarkForge（墨拓笔记）

> **简洁、本地优先、完全免费的桌面端 Markdown 创作与知识库工作台。**

MarkForge 基于 **Electron + React + TypeScript + Vditor** 构建，内置离线渲染资源与高对比度深/浅双色主题，无需联网、无付费墙与功能限制，兼顾日常笔记记录、技术文档编写与演示汇报需求。

---

## 核心定位

- **本地优先与完全免费**：文档全量存储于本地磁盘，内置离线语法高亮、公式与图表渲染依赖，开箱即用。
- **所见即所得与多视图协同**：默认提供平滑直观的「所见即所得」写作体验，同时保留「即时渲染 (IR)」「纯文本源码」「分屏预览」以满足不同场景习惯。
- **工程化与键盘流效率**：围绕高频编辑动作提供全局命令面板、页内查找替换、专业表格控制引擎及零阻塞原生弹窗。

---

## 主要功能

### 1. 多视图编辑与统一代码高亮
- **四模式无缝切换**：默认 **所见即所得 (WYSIWYG)**，支持 **即时渲染 (IR)**、**源代码模式**（`Ctrl+/`）与 **分屏预览**，并在工具栏与状态栏同步高亮显示当前模式。
- **代码块编辑/预览统一**：基于 `highlight.js` 与透明编辑叠层同步机制，在编辑代码块时即可实时呈现与预览一致的语法配色、左侧行号与语言徽章。
- **专业排版支持**：原生支持 KaTeX 行内/块级数学公式、Mermaid 流程图/图表、`> [!NOTE]` / `> [!WARNING]` 提示卡片，以及右下角「快捷排版」一键插块浮窗。

### 2. 现代化表格编辑引擎
- 默认以 **100% 内容区宽度** 自适应显示，兼顾单元格折行与表内行内代码单行清晰展示。
- 提供 **8×10 可视化网格插表器**、**14 项表格控制工具箱** 与表格内悬浮快捷胶囊，支持 `Tab` / `Shift+Tab` 连续跳格及末格自动增行、`Ctrl+Enter` 插入下方行、`Alt+方向键` 移动行列、列对齐与源码对齐格式化。

### 3. 工作区知识库与多标签页管理
- **目录树与文件操作**：支持打开本地文件夹作为知识库，内置原生弹窗支持新建 Markdown 文档/文件夹、重命名、移入回收站及目录刷新；支持 Windows 系统右键「打开方式」直接启动并关联 `.md` / `.markdown` 文件。
- **多标签与安全持久化**：支持多文档标签页切换、状态栏 1.5s 防抖自动保存、关闭未保存文档拦截确认弹窗。
- **高效导航与检索**：内置 `Ctrl+P` 快速打开命令面板、侧边栏多级标题大纲跳转、侧栏全文检索及编辑区右上角 `Ctrl+F` / `Ctrl+H` 高亮查找与批量替换。

### 4. 专注写作、幻灯片演示与多格式导出
- **写作辅助**：提供高对比昼夜主题切换（`Ctrl+Shift+L`）、沉浸式禅模式（`F11`）、打字机模式（光标垂直居中）、专注模式（高亮当前段落）、窗口置顶（`Ctrl+Shift+T`）与 `F12` 开发者模式。
- **幻灯片放映**：使用 `---` 分页后可按 `Ctrl+Shift+P` 一键全屏演示 Markdown 内容。
- **多格式导出**：支持导出为 **PDF**、主题化 **HTML**、**PNG 长图**、**Markdown (`.md`)** 及 **纯文本 (`.txt`)**。

---

## 技术栈

| 领域 | 选型与说明 |
| :--- | :--- |
| **桌面框架** | Electron 33 + Node/TypeScript（按窗口、文件、导出、安装分域封装 IPC） |
| **前端界面** | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Lucide Icons |
| **无头组件库** | Radix UI（`Dialog` / `DropdownMenu` / `Tooltip`）+ `cmdk` |
| **编辑器内核** | Vditor 3（全本地离线静态资源 + KaTeX + highlight.js + Mermaid） |
| **打包与安装** | `electron-builder` (NSIS) + C# WinForms 原生单文件自解压安装/卸载器 |

---

## 项目结构

```text
EvolutionText/
├── electron/                 # Electron 主进程与预加载桥接
│   ├── main.ts               # 应用生命周期、单实例与冷启动文件打开、Windows 关联注册
│   ├── preload.ts            # contextBridge 安全暴露 window.electronAPI
│   └── ipc/                  # 分域 IPC 处理器（windowIpc / fileIpc / exportIpc / installerIpc）
├── src/
│   ├── App.tsx               # 应用主框架与页面布局编排
│   ├── components/
│   │   ├── ui/               # 通用无头原语封装（Modal / DropdownMenu / Tooltip / CloseButton / Kbd）
│   │   ├── editor/           # 编辑器悬浮子组件（SlashInsertMenu / TableQuickPill / LinkHoverTooltip）
│   │   ├── header/           # 顶部菜单栏与窗口控制按钮
│   │   ├── sidebar/          # 文件树、实时大纲与侧栏检索面板
│   │   ├── context-menu/     # 右键上下文菜单链接、图片与表格子菜单
│   │   └── *.tsx             # Editor / EditorFindBar / StatusBar / SlideViewer / 各类 Modal 等
│   ├── hooks/                # 业务与编辑器状态 Hooks（useTabs / useWorkspace / useGlobalShortcuts / useCodeBlockSync 等）
│   ├── utils/                # 表格操作引擎、命令分发、链接锚点定位与字数大纲统计
│   ├── styles/               # 模块化样式（tokens / ui-popovers / editor-core / code-block / mermaid）
│   ├── constants/            # 默认欢迎引导文档等静态常量
│   ├── data/                 # 多版本更新日志数据源（changelog.json）
│   └── types/                # ElectronAPI 等渲染进程类型声明
├── scripts/                  # 版本同步脚本、图标生成脚本与 C# 安装/卸载器源码
├── public/                   # 离线 Vditor 静态资源
└── resources/                # 应用图标与构建期生成的卸载程序
```

---

## 快速开始

### 环境要求
- **Node.js** 18+ & **npm**
- Windows 打包需要系统内置 .NET Framework 4.x `csc.exe`（用于编译原生安装/卸载器）

### 安装依赖与本地开发

```bash
# 安装项目依赖
npm install

# 启动 Vite 开发服务器（渲染进程热更新，默认端口 5173）
npm run dev

# 另开终端构建主进程并启动 Electron 桌面窗口
npm run build:electron && npm start
```

### 构建与打包发布

```bash
# 全量构建生产产物（卸载器 + Vite 渲染层 + Electron 主进程 TypeScript 编译）
npm run build

# 同步版本与日志并打包 Windows 安装包（输出至 release/ 目录）
npm run dist
```

打包完成后可在 `release/` 目录获取：
- `MarkForge-Installer.exe`：原生极速单文件安装向导（支持无感原位覆盖升级并保留配置）
- `MarkForge Setup <version>.exe`：标准 NSIS 安装包

---

## 常用快捷键速览

| 操作 | 快捷键 | 说明 |
| :--- | :--- | :--- |
| 快速打开文档 | `Ctrl + P` | 唤起工作区文件模糊检索面板 |
| 页内查找 / 替换 | `Ctrl + F` / `Ctrl + H` | 编辑区聚焦时打开页内高亮查找替换栏 |
| 侧栏全局检索 | `Ctrl + Shift + F` | 打开并聚焦左侧文档搜索面板 |
| 新建 / 保存 / 另存为 | `Ctrl + N` / `Ctrl + S` / `Ctrl + Shift + S` | 新建标签页、立即写入或另存副本 |
| 打开文件 / 文件夹 | `Ctrl + O` / `Ctrl + Shift + O` | 选择本地文档或打开知识库工作区 |
| 标题转换 / 恢复正文 | `Ctrl + 1 ~ 6` / `Ctrl + 0` | 将当前行或选中文本设为 H1~H6 或正文 |
| 插入与管理表格 | `Ctrl + T` | 表外唤起网格插表器，表内打开表格工具箱 |
| 源代码模式切换 | `Ctrl + /` | 富文本编辑与纯源码视图快速切换 |
| 开发者模式 | `F12` | 打开 / 关闭 Chromium DevTools 面板 |
| 昼夜主题 / 禅模式 / 幻灯片 | `Ctrl + Shift + L` / `F11` / `Ctrl + Shift + P` | 切换深浅主题、全屏专注写作或 PPT 放映 |
| 快捷键速查手册 | `F1` | 随时查看完整快捷键列表 |

---

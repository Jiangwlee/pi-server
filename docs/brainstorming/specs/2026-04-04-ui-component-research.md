# UI 组件库研究：pi-webui vs lobe-ui 对比与引入策略

> 研究日期：2026-04-04
> 背景：pi-server 正在构建 React 前端（@pi-server/ui + @pi-server/frontend），需要确定组件来源策略。本文档对比分析了 pi-mono/web-ui（内部）和 @lobehub/ui（社区）两个组件库，从功能覆盖、消息格式兼容性、依赖链、用户体验等多维度评估引入可行性。

## 目录

- [pi-webui 组件分析](#pi-webui-组件分析)
  - [技术栈概况](#技术栈概况)
  - [完整组件清单](#完整组件清单)
  - [按引入价值排序](#按引入价值排序)
- [lobe-ui 组件分析](#lobe-ui-组件分析)
  - [技术栈概况](#lobe-ui-技术栈概况)
  - [完整组件清单](#lobe-ui-完整组件清单)
- [pi-webui vs lobe-ui 功能覆盖对比](#pi-webui-vs-lobe-ui-功能覆盖对比)
  - [聊天核心](#聊天核心)
  - [代码与内容渲染](#代码与内容渲染)
  - [Tool/Agent 可视化](#toolagent-可视化)
  - [模型与设置](#模型与设置)
  - [通用 UI 基础设施](#通用-ui-基础设施)
- [用户体验优先级分析](#用户体验优先级分析)
  - [第一层：基础体验（P0）](#第一层基础体验p0)
  - [第二层：核心体验（P1）](#第二层核心体验p1)
  - [第三层：差异化体验（P2）](#第三层差异化体验p2)
  - [第四层：进阶功能（P3）](#第四层进阶功能p3)
  - [最小可爱产品（MLP）清单](#最小可爱产品mlp清单)
- [lobe-ui 引入可行性深度分析](#lobe-ui-引入可行性深度分析)
  - [依赖链评估](#依赖链评估)
  - [消息格式差异（核心问题）](#消息格式差异核心问题)
  - [具体差异点](#具体差异点)
  - [适配方案评估](#适配方案评估)
- [最终结论与引入策略](#最终结论与引入策略)
  - [核心判断](#核心判断)
  - [补充要点](#补充要点)
  - [推荐引入路线](#推荐引入路线)

---

## pi-webui 组件分析

### 技术栈概况

- **包名**：`@mariozechner/pi-web-ui` (v0.56.2)
- **框架**：Lit + Web Components + mini-lit（非 React）
- **样式**：Tailwind CSS
- **核心依赖**：`@mariozechner/pi-ai`, `@mariozechner/pi-tui`, `lit`, `lucide`, `pdfjs-dist`, `xlsx`, `jszip`
- **UI 基础库**：`@mariozechner/mini-lit`（自建 Web Components 基础库）
- **源码位置**：`~/Projects/mindoclaw/github/pi-mono/packages/web-ui/src/`

### 完整组件清单

#### 核心聊天组件

| 组件 | 文件 | 行数 | 功能 |
|------|------|------|------|
| `ChatPanel` | `ChatPanel.ts` | 207 | 顶层聊天面板，组合 AgentInterface + ArtifactsPanel，响应式布局（800px 断点切换 overlay/side-by-side） |
| `AgentInterface` | `components/AgentInterface.ts` | 388 | 聊天主界面，组合 MessageEditor + MessageList + StreamingMessageContainer，管理 agent session 生命周期、发送消息、流式渲染 |
| `Messages` | `components/Messages.ts` | 383 | 消息渲染组件集：UserMessage, AssistantMessage, ToolMessage, ToolMessageDebugView, AbortedMessage。处理 text/image/toolCall/thinking 等内容类型 |
| `MessageList` | `components/MessageList.ts` | 98 | 消息列表渲染，遍历 AgentMessage[] 分发到对应的消息组件 |
| `StreamingMessageContainer` | `components/StreamingMessageContainer.ts` | 103 | 流式消息容器，处理 SSE delta 事件的实时追加渲染 + 自动滚动 |
| `MessageEditor` | `components/MessageEditor.ts` | 400 | 消息输入编辑器，支持多行输入、快捷键（Enter 发送/Shift+Enter 换行）、附件、运行态切换（send↔abort） |
| `Input` | `components/Input.ts` | 113 | 通用输入组件 |
| `ThinkingBlock` | `components/ThinkingBlock.ts` | 43 | 折叠/展开 AI 推理过程的组件 |

#### 消息渲染注册

| 组件 | 文件 | 功能 |
|------|------|------|
| `message-renderer-registry` | `components/message-renderer-registry.ts` | 消息渲染器注册机制：`registerMessageRenderer()`, `getMessageRenderer()`, `renderMessage()` |

#### Sandbox 系统（6 个文件）

| 组件 | 文件 | 功能 |
|------|------|------|
| `SandboxedIframe` | `components/SandboxedIframe.ts` | 沙箱 iframe 容器，用于客户端代码执行 |
| `SandboxRuntimeProvider` | `components/sandbox/SandboxRuntimeProvider.ts` | 沙箱运行时 provider 接口定义（getData, getRuntime, handleMessage, getDescription） |
| `RuntimeMessageBridge` | `components/sandbox/RuntimeMessageBridge.ts` | 沙箱与主页面的消息桥接 |
| `RuntimeMessageRouter` | `components/sandbox/RuntimeMessageRouter.ts` | 沙箱消息路由 |
| `ArtifactsRuntimeProvider` | `components/sandbox/ArtifactsRuntimeProvider.ts` | Artifacts 运行时 provider |
| `AttachmentsRuntimeProvider` | `components/sandbox/AttachmentsRuntimeProvider.ts` | 附件运行时 provider |
| `ConsoleRuntimeProvider` | `components/sandbox/ConsoleRuntimeProvider.ts` | 控制台运行时 provider |
| `FileDownloadRuntimeProvider` | `components/sandbox/FileDownloadRuntimeProvider.ts` | 文件下载运行时 provider |

#### 弹窗/对话框

| 组件 | 文件 | 行数 | 功能 |
|------|------|------|------|
| `ModelSelector` | `dialogs/ModelSelector.ts` | 313 | 模型选择对话框，含搜索过滤、键盘导航、thinking/vision 过滤、费用显示 |
| `SessionListDialog` | `dialogs/SessionListDialog.ts` | 150 | 会话列表对话框，选择/删除/显示用量 |
| `SettingsDialog` | `dialogs/SettingsDialog.ts` | 214 | 设置面板（ApiKeysTab, ProxyTab, SettingsTab） |
| `AttachmentOverlay` | `dialogs/AttachmentOverlay.ts` | 636 | 附件上传/预览覆盖层 |
| `CustomProviderDialog` | `dialogs/CustomProviderDialog.ts` | 274 | 自定义 provider 配置 |
| `ProvidersModelsTab` | `dialogs/ProvidersModelsTab.ts` | 212 | Provider 和模型管理 Tab |
| `ApiKeyPromptDialog` | `dialogs/ApiKeyPromptDialog.ts` | 75 | API Key 输入提示 |
| `PersistentStorageDialog` | `dialogs/PersistentStorageDialog.ts` | 144 | 持久化存储管理 |

#### Tool 渲染器

| 组件 | 文件 | 行数 | 功能 |
|------|------|------|------|
| `renderer-registry` | `tools/renderer-registry.ts` | - | Tool 渲染器注册机制：`registerToolRenderer()`, `getToolRenderer()`, `renderTool()` |
| `DefaultRenderer` | `tools/renderers/DefaultRenderer.ts` | 103 | 默认 tool 渲染器 |
| `BashRenderer` | `tools/renderers/BashRenderer.ts` | 52 | Bash 命令执行渲染器 |
| `CalculateRenderer` | `tools/renderers/CalculateRenderer.ts` | 58 | 计算器 tool 渲染器 |
| `GetCurrentTimeRenderer` | `tools/renderers/GetCurrentTimeRenderer.ts` | 92 | 时间查询 tool 渲染器 |

#### Artifacts 系统

| 组件 | 文件 | 行数 | 功能 |
|------|------|------|------|
| `ArtifactsPanel` / `artifacts.ts` | `tools/artifacts/artifacts.ts` | 713 | Artifacts 主面板，管理 artifact CRUD 和展示 |
| `ArtifactsToolRenderer` | `tools/artifacts/artifacts-tool-renderer.ts` | 310 | Artifacts tool 渲染器 |
| `HtmlArtifact` | `tools/artifacts/HtmlArtifact.ts` | 195 | HTML artifact 预览 |
| `SvgArtifact` | `tools/artifacts/SvgArtifact.ts` | 78 | SVG artifact 预览 |
| `ImageArtifact` | `tools/artifacts/ImageArtifact.ts` | 116 | 图片 artifact 预览 |
| `MarkdownArtifact` | `tools/artifacts/MarkdownArtifact.ts` | 82 | Markdown artifact 预览 |
| `TextArtifact` | `tools/artifacts/TextArtifact.ts` | 148 | 文本 artifact 预览 |
| `PdfArtifact` | `tools/artifacts/PdfArtifact.ts` | 201 | PDF artifact 预览 |
| `DocxArtifact` | `tools/artifacts/DocxArtifact.ts` | 213 | Word 文档 artifact 预览 |
| `ExcelArtifact` | `tools/artifacts/ExcelArtifact.ts` | 231 | Excel artifact 预览 |
| `GenericArtifact` | `tools/artifacts/GenericArtifact.ts` | 117 | 通用 artifact 预览 |
| `Console` | `tools/artifacts/Console.ts` | 93 | 控制台 artifact |
| `ArtifactElement` | `tools/artifacts/ArtifactElement.ts` | 14 | Artifact 基础元素 |
| `ArtifactPill` | `tools/artifacts/ArtifactPill.ts` | 26 | Artifact 胶囊标签 |

#### 工具函数

| 模块 | 文件 | 功能 |
|------|------|------|
| `format.ts` | `utils/format.ts` | formatCost, formatModelCost, formatTokenCount, formatUsage — 纯 TS 工具函数 |
| `i18n.ts` | `utils/i18n.ts` | 国际化框架，支持中英文 |
| `attachment-utils.ts` | `utils/attachment-utils.ts` | 附件处理工具 |
| `auth-token.ts` | `utils/auth-token.ts` | 客户端 token 管理 |
| `model-discovery.ts` | `utils/model-discovery.ts` | 模型发现 |
| `proxy-utils.ts` | `utils/proxy-utils.ts` | 代理工具 |
| `test-sessions.ts` | `utils/test-sessions.ts` | 测试会话工具 |

#### 存储层

| 模块 | 文件 | 功能 |
|------|------|------|
| `AppStorage` | `storage/app-storage.ts` | 高层存储 API（settings, providerKeys, sessions, customProviders） |
| `Store` | `storage/store.ts` | 通用 Store 基类 |
| `IndexedDBStorageBackend` | `storage/backends/indexeddb-storage-backend.ts` | IndexedDB 存储后端 |
| `SessionsStore` | `storage/stores/sessions-store.ts` | 会话存储 |
| `SettingsStore` | `storage/stores/settings-store.ts` | 设置存储 |
| `ProviderKeysStore` | `storage/stores/provider-keys-store.ts` | Provider Key 存储 |
| `CustomProvidersStore` | `storage/stores/custom-providers-store.ts` | 自定义 Provider 存储 |

#### Prompts

| 模块 | 文件 | 功能 |
|------|------|------|
| `prompts.ts` | `prompts/prompts.ts` | Artifacts/Attachments 的 runtime provider 描述文本 |

### 按引入价值排序

#### 核心差异：技术栈不兼容

pi-webui 基于 **Lit + Web Components + mini-lit**，而 pi-server/ui 基于 **React 19 + classNames API**。两者不是简单复制的关系，所有组件都需要 **重写为 React**，只能复用**设计逻辑和交互模式**。

此外 pi-webui 的数据层依赖 `@mariozechner/pi-agent-core` + `@mariozechner/pi-ai` + IndexedDB 客户端存储，而 pi-server 的架构是 **服务端持有所有状态**（SQLite + on-demand session），client 层通过 REST+SSE 通信。所以 storage 层和 agent 集成逻辑基本不能复用。

#### P0 — 必须引入（Chat 核心）

| 组件 | 价值 | 引入策略 |
|------|------|----------|
| `Messages.ts` (UserMessage, AssistantMessage, ToolMessage, AbortedMessage) | 消息渲染是聊天界面核心，pi-webui 已处理 text/image/toolCall/thinking 等消息类型的展示逻辑 | 重写为 React，复用消息类型判断和渲染结构 |
| `MessageList.ts` + `StreamingMessageContainer.ts` | 消息列表 + 流式追加渲染 + 自动滚动，这是 SSE 流式体验的关键 | 重写为 React，复用自动滚动和流式追加逻辑 |
| `MessageEditor.ts` (即 Input/Composer) | 400 行，含多行输入、快捷键(Enter发送/Shift+Enter换行)、附件支持、运行态切换(send↔abort) | 重写为 React ChatInput，复用交互设计 |

#### P1 — 高价值

| 组件 | 价值 | 引入策略 |
|------|------|----------|
| `ThinkingBlock.ts` | 展示 AI thinking/reasoning 过程的折叠块，对 reasoning model 体验很重要 | 小组件，直接重写，43 行 |
| `ModelSelector.ts` | 313 行，含搜索过滤、键盘导航、thinking/vision 过滤、费用显示 | 重写为 React，pi-server 的 `/api/models` 可直接对接 |
| `format.ts` (formatCost, formatTokenCount, formatUsage) | 格式化 token 用量和费用的纯工具函数 | **可直接复制**，零依赖纯 TS |
| `i18n.ts` | 国际化框架，支持中英文 | **可直接复制**或参考模式 |

#### P2 — 中价值

| 组件 | 价值 | 引入策略 |
|------|------|----------|
| `SessionListDialog.ts` | 会话列表 UI（选择/删除/显示用量） | 交互参考价值，但 pi-server 的 session 模型不同（服务端管理），需要较大改造 |
| Tool Renderers + `renderer-registry.ts` | 渲染 tool call 结果的注册机制 + 各 tool 专用渲染器 | 注册模式值得复用，具体渲染器需要按 pi-server 支持的 tools 定制 |
| `ExpandableSection.ts` | 通用折叠/展开组件 | 简单组件，React 生态有大量替代 |

#### P3 — 低价值/不适用

| 组件 | 原因 |
|------|------|
| Artifacts 系统 (713行 artifacts.ts + 9种 artifact 类型) | pi-server 是服务端执行模式，artifacts 的 sandbox iframe 架构不匹配。暂不引入，等有明确需求再评估 |
| Sandbox 系统 (6个文件) | 与 pi-server on-demand session 架构完全不同 |
| `AttachmentTile.ts` + `AttachmentOverlay.ts` | pi-server 当前 send 接口只接受 `{ message }`，不支持附件。等后端扩展后再引入 |
| Storage 层 (AppStorage, IndexedDB, 各 Store) | pi-server 数据在服务端 SQLite |
| Provider/API Key 相关 (ProviderKeyInput, ApiKeyPromptDialog, CustomProviderCard, ProvidersModelsTab) | pi-server 统一管理凭证，用户无需输入 API key |
| `proxy-utils.ts`, `auth-token.ts` | pi-server 用 cookie auth + Next.js rewrites，不需要 |

#### 推荐引入路线

**Phase 2 当前任务（Task 7: Chat 垂直切片）直接参考：**
1. `Messages.ts` → 重写为 React `UserMessage`, `AssistantMessage`, `ToolMessage`
2. `MessageList.ts` + `StreamingMessageContainer.ts` → React `MessageList` + 流式更新逻辑
3. `MessageEditor.ts` → React `ChatInput`（交互设计参考）
4. `ThinkingBlock.ts` → React `ThinkingBlock`
5. `format.ts` → 直接复制到 `packages/ui/src/utils/`

**Phase 2 后续（Task 8）：**
6. `ModelSelector.ts` → React 重写
7. `i18n.ts` → 复制或参考

**未来按需：**
8. Tool renderer 注册机制
9. Artifacts（如果 pi-server 后续支持客户端预览）

---

## lobe-ui 组件分析

### lobe-ui 技术栈概况

- **包名**：`@lobehub/ui` (v5.6.3)
- **框架**：React 19
- **样式方案**：antd-style（CSS-in-JS）+ Ant Design token 系统
- **UI 基础**：Ant Design v6 + @base-ui/react
- **核心依赖（70+）**：antd, antd-style, @ant-design/cssinjs, shiki, react-markdown, mermaid, motion, lucide-react, swr, virtua 等
- **peer dependencies**：react ^19, react-dom ^19, antd ^6.1, motion ^12, @lobehub/fluent-emoji ^4, @lobehub/icons ^5
- **源码位置**：`~/Github/lobe-ui/src/`
- **子模块导出**：`@lobehub/ui`, `@lobehub/ui/chat`, `@lobehub/ui/awesome`, `@lobehub/ui/brand`, `@lobehub/ui/mdx`, `@lobehub/ui/mobile`, `@lobehub/ui/base-ui`

### lobe-ui 完整组件清单

#### 通用组件 (12)

| 组件 | 功能 |
|------|------|
| `A` | Link anchor wrapper，支持 ConfigProvider 配置元素类型 |
| `ActionIcon` | 图标按钮，多种 variant/size/交互状态，集成 Lucide 图标 + Tooltip |
| `ActionIconGroup` | ActionIcon 容器，统一布局 + 下拉菜单集成 |
| `Block` | 弹性容器，扩展 Flexbox，支持 variant/shadow/glass 效果 |
| `Burger` | 菜单触发按钮，显示选中项 + 嵌套菜单 |
| `Button` | 按钮组件，多种 variant/size/交互状态/图标集成 |
| `Checkbox` / `CheckboxGroup` | 复选框组件 |
| `Freeze` | 使用 React Suspense 阻止子组件 DOM 更新（用于退出动画） |
| `Icon` | SVG 图标组件，基于 lucide-react |
| `Text` | 排版组件，多种样式/格式/颜色/省略号 |
| `Flex` / `Center` / `FlexBasic` / `Flexbox` | Flexbox 布局组件 |
| `Grid` | 响应式网格布局，自动调整列数 |

#### 数据展示 (22)

| 组件 | 功能 |
|------|------|
| `Accordion` | 垂直堆叠可交互标题，带动画 |
| `Alert` | 重要消息/通知展示，可配置类型/图标/操作 |
| `Avatar` / `AvatarGroup` / `GroupAvatar` | 用户头像/头像组，支持 emoji/图片/自定义 |
| `CodeDiff` | 代码差异展示，语法高亮 + 文件对比 |
| `Collapse` | 可折叠内容容器 |
| `Empty` | 空态组件，可配置图标/emoji/图片/标题/描述/操作按钮 |
| `FileTypeIcon` | 文件类型图标，支持多种文件和文件夹类型 |
| `FluentEmoji` | Fluent 设计风格 emoji（modern/flat/high-contrast） |
| `Highlighter` / `SyntaxHighlighter` | 语法高亮代码块，支持复制/语言选择/自定义主题/transformers |
| `Hotkey` | 键盘快捷键展示 |
| `Image` | 增强图片组件，预览/自定义操作/多种展示样式 |
| `List` / `ListItem` | 列表渲染组件 |
| `Markdown` / `Typography` | Markdown 渲染，支持标题/列表/链接/图片/代码块 |
| `Mermaid` / `SyntaxMermaid` | Mermaid 图表渲染（流程图/时序图/类图等） |
| `Segmented` | 分段选择器 |
| `Skeleton` | 骨架屏加载占位 |
| `SortableList` | 拖拽排序列表 |
| `Tag` | 标签组件，多种样式 |
| `Toc` | 目录组件，可点击锚链接 |
| `Tooltip` | 提示信息组件 |
| `Video` | 视频组件，可配置控件/预览/多种样式 |

#### 数据录入 (17)

| 组件 | 功能 |
|------|------|
| `AutoComplete` | 输入自动补全下拉建议 |
| `CodeEditor` | 代码编辑器，多语言语法高亮 |
| `ColorSwatches` | 颜色选择器 |
| `CopyButton` | 复制到剪贴板按钮，带成功/失败 tooltip |
| `DatePicker` | 日期选择器 |
| `DownloadButton` | 下载按钮，支持 Blob URL + 文件类型指示 |
| `EditableText` | 内联文本编辑 |
| `EditorSlashMenu` | 斜杠命令菜单 |
| `EmojiPicker` | Emoji 选择器，支持自定义 emoji 集 |
| `Form` / `FormGroup` / `FormItem` / `FormTitle` / `FormSubmitFooter` | 高性能表单组件 |
| `FormModal` | 模态表单 |
| `HotkeyInput` | 快捷键录入组件 |
| `ImageSelect` | 图片选择组件 |
| `Input` / `InputNumber` / `InputPassword` / `TextArea` / `InputOPT` | 文本输入组件集 |
| `SearchBar` | 搜索栏 |
| `Select` | 下拉选择器 |
| `SliderWithInput` | 滑块 + 输入框组合 |

#### 反馈 (5)

| 组件 | 功能 |
|------|------|
| `Alert` | 通知/警告消息展示 |
| `Drawer` | 侧边抽屉面板 |
| `Giscus` | GitHub Discussions 评论系统 |
| `Modal` | 模态对话框 |
| `Toast` / `ToastHost` | Toast 通知系统，命令式 API |

#### 导航 (6)

| 组件 | 功能 |
|------|------|
| `ContextMenu` | 右键菜单，命令式 API |
| `Dropdown` | 下拉菜单（deprecated，推荐 DropdownMenu） |
| `DropdownMenu` | 基于 Base UI 的下拉菜单 |
| `Menu` | 导航菜单，支持子菜单/分割线/分组 |
| `SideNav` | 侧边导航栏，支持头像 + 顶部/底部操作 |
| `Tabs` | 标签页导航 |

#### 布局 (10)

| 组件 | 功能 |
|------|------|
| `DraggablePanel` | 可拖拽调整大小的面板，支持固定和展开 |
| `DraggableSideNav` | 可拖拽侧边面板，支持折叠/展开 + 智能拖拽折叠 |
| `Footer` | 网站页脚，自定义列布局 + 主题选择 |
| `Header` | 网站头部，logo + 导航 + 响应式 |
| `Layout` / `LayoutHeader` / `LayoutMain` / `LayoutSidebar` / `LayoutFooter` / `LayoutToc` | 基础布局结构组件 |
| `MaskShadow` | 渐变阴影遮罩，指示内容溢出 |
| `ScrollArea` | 原生滚动容器，自定义滚动条 + 渐变淡出 |
| `ScrollShadow` | 滚动阴影指示器 |

#### 主题 & Provider (5)

| 组件 | 功能 |
|------|------|
| `ConfigProvider` | 全局配置 provider（CDN、元素类型覆盖） |
| `FontLoader` | 字体加载器 |
| `MotionProvider` | 动画 provider（已合入 ConfigProvider） |
| `ThemeProvider` | 主题 provider，支持自定义 + 字体加载 |
| `ThemeSwitch` | 主题切换下拉菜单（暗色/亮色/自动） |

#### 聊天专用 (12)

| 组件 | 功能 |
|------|------|
| `BackBottom` | 回到底部按钮，带可见性阈值控制 |
| `Bubble` | 消息气泡容器，支持样式变体和阴影 |
| `ChatHeader` / `ChatHeaderTitle` | 聊天头部，可配置左右内容 |
| `ChatInputArea` / `ChatInputAreaInner` / `ChatSendButton` / `ChatInputActionBar` | 聊天输入区域，操作栏 + 发送按钮 |
| `ChatItem` | 单条聊天消息组件，头像 + 内容 + 操作 + 元数据 |
| `ChatList` / `ChatActionsBar` | 聊天消息列表，可自定义消息渲染和操作 |
| `EditableMessage` | 可编辑消息组件，支持内联编辑 + 模态编辑 |
| `EditableMessageList` | 可编辑消息列表，增删功能 |
| `LoadingDots` | 加载动画（dots/pulse/wave） |
| `MessageInput` | 消息输入组件，快捷键 + 代码编辑器集成 |
| `MessageModal` | 消息编辑/撰写模态框，Markdown 预览 |
| `TokenTag` | Token 用量/限额显示，进度条 + 格式化 |

#### 特效组件 (11)

| 组件 | 功能 |
|------|------|
| `AuroraBackground` | 极光动画渐变背景 |
| `BottomGradientButton` | 底部渐变按钮 |
| `Features` | 特性网格展示 |
| `GradientButton` | 渐变按钮 + 发光效果 |
| `GridBackground` | 动态网格背景 |
| `Hero` | 着陆页 Hero 区域 |
| `Spline` | Spline 3D 模型渲染 |
| `Spotlight` | 鼠标跟随聚光灯效果 |
| `SpotlightCard` | 带聚光灯效果的卡片网格 |
| `TypewriterEffect` | 打字机动画 |

#### 品牌组件 (10)

LobeChat/LobeHub Logo 系列（3D/Flat/Mono/Text/Combined），品牌加载动画等。

#### MDX/文档组件 (11)

Callout, Cards, FileTree, Mdx, mdxComponents, Steps, Tabs 等。

#### 移动端组件 (4)

| 组件 | 功能 |
|------|------|
| `ChatHeader` (mobile) | 移动端聊天头部，支持安全区域 |
| `ChatInputArea` / `ChatSendButton` (mobile) | 移动端聊天输入 |
| `SafeArea` | 安全区域填充（刘海/圆角） |
| `TabBar` | 移动端底部标签栏 |

#### 总计

| 分类 | 数量 |
|------|------|
| 通用 | 12 |
| 数据展示 | 22 |
| 数据录入 | 17 |
| 反馈 | 5 |
| 导航 | 6 |
| 布局 | 10 |
| 主题 & Provider | 5 |
| 聊天专用 | 12 |
| 特效 | 11 |
| 品牌 | 10 |
| MDX/文档 | 11 |
| 移动端 | 4 |
| **总计** | **~136** |

---

## pi-webui vs lobe-ui 功能覆盖对比

### 基本情况

| | **lobe-ui** | **pi-webui** |
|---|---|---|
| 组件数量 | ~136 | ~35 |
| 技术栈 | **React** + Ant Design + Base UI + Tailwind | **Lit** + Web Components + mini-lit |
| 定位 | 通用 AI Chat UI 组件库（npm 发布） | pi-mono 专用聊天界面 |
| 主题 | ThemeProvider + CSS 变量 + 暗色/亮色 | Tailwind CSS |
| 依赖 | react, antd, @base-ui/react, lucide-react | lit, @mariozechner/mini-lit, lucide |

### 聊天核心

| 功能 | lobe-ui | pi-webui | 谁更强 |
|------|---------|----------|--------|
| 消息气泡 | `Bubble`, `ChatItem` — 支持 avatar、actions、metadata | `Messages.ts` (UserMessage/AssistantMessage/ToolMessage) | lobe-ui 更完整（avatar、操作栏） |
| 消息列表 | `ChatList` + `ChatActionsBar` | `MessageList` + `StreamingMessageContainer` | pi-webui 流式更原生 |
| 输入框 | `ChatInputArea` + `ChatSendButton` + `ChatInputActionBar` + `MessageInput` | `MessageEditor`（400行，含附件、快捷键） | 各有千秋，lobe-ui 拆分更细 |
| 消息编辑 | `EditableMessage` + `EditableMessageList` + `MessageModal` | `MessageEditor`（编辑已发消息） | lobe-ui 更完善（modal 编辑） |
| Token 显示 | `TokenTag` — 进度条+格式化 | `formatUsage`/`formatCost` 工具函数 | lobe-ui 有现成组件 |
| 加载动画 | `LoadingDots`（dots/pulse/wave） | 无独立组件 | lobe-ui |
| 回到底部 | `BackBottom` — 带阈值控制 | 内嵌在 StreamingMessageContainer | lobe-ui 独立可复用 |
| 聊天头部 | `ChatHeader` + `ChatHeaderTitle` + 移动端版本 | 无独立组件 | lobe-ui |

### 代码与内容渲染

| 功能 | lobe-ui | pi-webui | 谁更强 |
|------|---------|----------|--------|
| Markdown | `Markdown`/`Typography` — 完整 MD 渲染 | 依赖 mini-lit `MarkdownBlock` | lobe-ui 更独立 |
| 代码高亮 | `Highlighter`/`SyntaxHighlighter` — 多主题+复制 | 无独立组件 | lobe-ui |
| 代码差异 | `CodeDiff` | 无 | lobe-ui |
| 代码编辑 | `CodeEditor` | 无 | lobe-ui |
| Mermaid 图表 | `Mermaid`/`SyntaxMermaid` | 无 | lobe-ui |
| Thinking 块 | 无专门组件 | `ThinkingBlock` — 折叠推理过程 | pi-webui |

### Tool/Agent 可视化

| 功能 | lobe-ui | pi-webui | 谁更强 |
|------|---------|----------|--------|
| Tool 渲染注册 | 无 | `renderer-registry` + `BashRenderer`/`DefaultRenderer` 等 | **pi-webui 远胜** |
| Artifacts 系统 | 无 | `ArtifactsPanel` + 9 种 artifact 类型 | **pi-webui 独有** |
| Sandbox 执行 | 无 | `SandboxedIframe` + RuntimeProviders | **pi-webui 独有** |
| 文件类型图标 | `FileTypeIcon` | 无 | lobe-ui |

### 模型与设置

| 功能 | lobe-ui | pi-webui | 谁更强 |
|------|---------|----------|--------|
| 模型选择 | 无专门组件 | `ModelSelector` — 搜索+过滤+费用 | pi-webui |
| Session 列表 | 无专门组件 | `SessionListDialog` | pi-webui |
| 设置面板 | 无专门组件 | `SettingsDialog` + 多个 Tab | pi-webui |

### 通用 UI 基础设施

| 功能 | lobe-ui | pi-webui | 谁更强 |
|------|---------|----------|--------|
| 主题系统 | `ThemeProvider` + `ThemeSwitch` — 暗色/亮色/自动 | 无 | **lobe-ui 远胜** |
| 布局系统 | `Layout`/`DraggablePanel`/`DraggableSideNav`/`ScrollArea` | 无 | **lobe-ui 远胜** |
| 表单系统 | `Form`/`FormGroup`/`FormItem`/`FormModal` | 无 | lobe-ui |
| 导航 | `SideNav`/`Menu`/`Tabs`/`ContextMenu`/`DropdownMenu` | 无 | lobe-ui |
| 反馈 | `Modal`/`Drawer`/`Toast`/`Alert` | 无 | lobe-ui |
| 动效 | `Spotlight`/`TypewriterEffect`/`AuroraBackground` 等 11 个 | 无 | lobe-ui |
| 移动端 | `SafeArea`/`TabBar`/移动版 ChatInput | 无 | lobe-ui |
| 图标 | `Icon`/`ActionIcon`/`ActionIconGroup` | 依赖 lucide 直接使用 | lobe-ui 封装更好 |
| 图片 | `Image`（预览+操作）/ `Avatar`/`AvatarGroup` | 无 | lobe-ui |
| 空态 | `Empty` — icon+文案+操作 | 无 | lobe-ui |
| 骨架屏 | `Skeleton` | 无 | lobe-ui |

### 对比总结

| 维度 | 推荐来源 | 原因 |
|------|---------|------|
| **聊天消息渲染** | **lobe-ui** | React 原生、`ChatItem`/`Bubble` 拆分合理，avatar+actions+metadata 完整 |
| **Markdown/代码** | **lobe-ui** | `Markdown` + `Highlighter` + `CodeDiff` + `Mermaid` 是完整方案 |
| **流式 SSE 渲染** | **pi-webui 参考逻辑** | lobe-ui 没有流式处理，需要参考 pi-webui 的 `StreamingMessageContainer` |
| **Tool Call 可视化** | **pi-webui 参考逻辑** | lobe-ui 没有 tool renderer 注册机制，这是 coding agent 刚需 |
| **ThinkingBlock** | **pi-webui 参考逻辑** | lobe-ui 没有 thinking 折叠组件 |
| **主题/布局/通用UI** | **lobe-ui** | 完整的主题系统、布局体系、表单、弹窗、导航，pi-webui 完全缺失 |
| **Token 用量** | **lobe-ui** `TokenTag` + **pi-webui** `format.ts` | 组件用 lobe-ui，格式化函数参考 pi-webui |
| **模型选择器** | **pi-webui 参考设计** | lobe-ui 没有，需要自建，pi-webui 的搜索+过滤+费用 UX 可参考 |
| **移动端适配** | **lobe-ui** | SafeArea、移动版 ChatInput、TabBar |

**一句话：lobe-ui 提供 React 基础设施和聊天 UI 壳子，pi-webui 提供 agent 特有的交互逻辑（流式、tool 渲染、thinking、model selector）。两者互补，不是替代关系。**

---

## 用户体验优先级分析

从用户体验角度（而非组件来源角度）对功能进行分层排序，包括 pi-webui 和 lobe-ui 都未覆盖的新增需求。

### 第一层：基础体验（P0）

> 没有就不能用。spec Phase 2 Task 4-7 已覆盖，不再展开。

- Login → Session 列表 → 发消息 → SSE 流式回复 → 历史恢复

### 第二层：核心体验（P1）

> 决定用户是否愿意继续用。

| # | 功能 | 来源 | 为什么重要 |
|---|------|------|-----------|
| 1 | **Markdown 渲染 + 代码高亮** | 新增 | AI 回复 90% 包含代码块和格式化文本。纯文本展示直接毁掉体验。需要 `react-markdown` + `shiki`/`prism`，支持复制代码按钮 |
| 2 | **流式打字效果 + 自动滚动** | pi-webui `StreamingMessageContainer` | SSE 逐 token 到达，需要平滑追加而非整段替换闪烁。滚动策略：用户在底部时自动滚、手动上翻时停止、出现"回到底部"浮动按钮 |
| 3 | **ThinkingBlock（推理过程折叠）** | pi-webui `ThinkingBlock.ts` | reasoning model（如 o1, Claude thinking）会输出大段推理过程，不折叠会淹没真正的回答。折叠态显示"思考中…"动画 + 耗时，展开可查看 |
| 4 | **Tool Call 可视化** | pi-webui `ToolRenderers` | coding agent 的核心——用户需要看到 agent 在做什么（读文件、执行命令、写代码）。最低要求：显示 tool 名 + 参数摘要 + 结果折叠 |
| 5 | **错误恢复 UX** | 新增 | 后端 status=error 允许 re-send，但前端需要清晰告知用户"出错了，可以重试"。包括：错误消息展示、重发按钮、网络断线重连提示 |
| 6 | **Session 上下文信息** | 新增 | 侧边栏每个 session 显示 label + 最后一条消息摘要 + 时间。没有这些，session 列表就是一堆无意义的 ID |

### 第三层：差异化体验（P2）

> 让产品出彩。

| # | 功能 | 来源 | 为什么重要 |
|---|------|------|-----------|
| 7 | **模型选择器** | pi-webui `ModelSelector` | 多模型是 pi-server 的核心优势。需要搜索过滤、能力标签（thinking/vision）、费用提示。可以放在 ChatInput 旁边或全局设置 |
| 8 | **Token 用量 & 费用显示** | pi-webui `format.ts` | 每条回复显示 token 消耗和估算费用。多用户场景下这是必须的（谁用了多少），也帮助用户选择性价比模型 |
| 9 | **键盘快捷键体系** | 新增 | `Enter` 发送 / `Shift+Enter` 换行 / `Ctrl+/` 切换 session / `Esc` 中断生成。重度用户的效率倍增器 |
| 10 | **暗色/亮色主题切换** | 新增 | 开发者用户绝大多数偏好暗色。Tailwind + CSS 变量实现成本低，体验提升大 |
| 11 | **消息编辑 & 重新生成** | pi-webui `MessageEditor` | 编辑之前发的消息重新生成回复。需要后端支持（当前 history 是 append-only JSONL），可能需要后端配合改造 |
| 12 | **响应式布局** | 新增 | 移动端可用。pi-webui 的 `BREAKPOINT=800px` 切换 overlay/side-by-side 是好参考。手机上隐藏侧边栏，抽屉式打开 |

### 第四层：进阶功能（P3）

> 长期规划。

| # | 功能 | 说明 |
|---|------|------|
| 13 | **文件附件上传** | 图片/文档上传给 vision model，需后端扩展 send 接口 |
| 14 | **Artifacts 预览** | HTML/SVG/代码 artifact 沙箱预览，类似 Claude Artifacts |
| 15 | **多 session 并行视图** | 同时查看多个 agent 执行状态，适合 power user |
| 16 | **搜索历史消息** | 跨 session 全文搜索 |
| 17 | **导出对话** | Markdown/JSON 导出 |

### 最小可爱产品（MLP）清单

如果要让用户第一次打开就觉得"这个能用、而且好用"，在 spec 现有 Task 4-7 基础上，**必须追加**的是：

1. **Markdown + 代码高亮**（没有这个，coding agent 的输出不可读）
2. **ThinkingBlock 折叠**（reasoning model 不折叠会把用户吓跑）
3. **Tool Call 基础可视化**（至少显示 tool name + 折叠详情，否则 agent 执行过程是黑盒）
4. **暗色主题**（Tailwind 实现成本极低，开发者期望值极高）

这四个加上 spec 已有的基础链路，就构成了一个体验合格的 MLP。其余的可以迭代追加。

---

## lobe-ui 引入可行性深度分析

### 依赖链评估

#### lobe-ui peer dependencies 兼容性

| 依赖 | pi-server/ui 现状 | 兼容性 |
|------|-------------------|--------|
| `react ^19` | 已有 (peerDep) | ✅ |
| `react-dom ^19` | 已有 (peerDep) | ✅ |
| `antd ^6.1` | **未引入** | ⚠️ 重量级（~1MB gzipped） |
| `motion ^12` | **未引入** | 轻量，可接受 |
| `@lobehub/fluent-emoji ^4` | **未引入** | 可选，不用 emoji 不需要 |
| `@lobehub/icons ^5` | **未引入** | 可选 |

#### lobe-ui 关键内部依赖

| 依赖 | 用途 | 影响 |
|------|------|------|
| `antd-style` | CSS-in-JS 样式方案（`cx`, `useResponsive` 等） | **深度耦合**，几乎所有组件都用 |
| `@ant-design/cssinjs` | antd 样式引擎 | antd-style 的底层 |
| `shiki` + `@shikijs/*` | 代码高亮 | Markdown/Highlighter 的核心 |
| `react-markdown` + `remark-*` + `rehype-*` | Markdown 渲染 | 约 7 个 remark/rehype 插件 |
| `mermaid` | 图表渲染 | 可选，按需 |
| `@base-ui/react` | 底层 UI 原语 | Menu/Modal/Toast 等依赖 |
| `swr` | 数据请求 | 部分 hook 依赖 |
| `virtua` | 虚拟滚动 | 列表性能 |

**结论：直接 `npm install @lobehub/ui` 技术上可行，但会带入 antd (~1MB gzipped) + antd-style + 约 70 个传递依赖。** 对于 pi-server 这个内部项目来说，bundle size 不是首要关注点，但 antd 的样式系统（CSS-in-JS + token）会与 spec 中规划的 Tailwind 方案产生冲突。

### 消息格式差异（核心问题）

这是最关键的适配点。两边的消息模型完全不同。

#### lobe-ui `ChatMessage` 格式

```typescript
// lobe-ui 期望的消息格式
interface ChatMessage {
  id: string
  role: 'user' | 'system' | 'assistant' | 'function'  // OpenAI 风格
  content: string                                        // 纯字符串
  meta: MetaData             // { avatar, title, backgroundColor }
  createAt: number
  updateAt: number
  error?: ChatMessageError   // { type, message, body }
  extra?: any
  plugin?: any
  parentId?: string
}

interface MetaData {
  avatar?: string | ReactNode
  backgroundColor?: string
  description?: string
  tags?: string[]
  title?: string
}
```

#### pi-server SSE 事件格式

SSE `pi` 事件携带的是 pi-agent 的 `AgentEvent`：

```typescript
// pi-agent AgentEvent（通过 SSE pi 事件透传）
type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean }
```

#### pi-agent 消息类型

```typescript
// pi-ai Message 类型
interface UserMessage {
  role: "user"
  content: string | (TextContent | ImageContent)[]
  timestamp: number  // Unix ms
}

interface AssistantMessage {
  role: "assistant"
  content: (TextContent | ThinkingContent | ToolCall)[]  // 结构化数组！
  api: Api
  provider: Provider
  model: string
  usage: Usage           // { inputTokens, outputTokens, cacheRead, total }
  stopReason: StopReason // "stop" | "length" | "toolUse" | "error" | "aborted"
  errorMessage?: string
  timestamp: number
}

interface ToolResultMessage<TDetails = any> {
  role: "toolResult"
  toolCallId: string
  toolName: string
  content: (TextContent | ImageContent)[]
  details?: TDetails
  isError: boolean
  timestamp: number
}

type Message = UserMessage | AssistantMessage | ToolResultMessage
```

#### AssistantMessageEvent（流式增量协议）

```typescript
type AssistantMessageEvent =
  | { type: "start"; partial: AssistantMessage }
  | { type: "text_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "text_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "text_end"; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: "thinking_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "thinking_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "thinking_end"; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: "toolcall_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "toolcall_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "toolcall_end"; contentIndex: number; toolCall: ToolCall; partial: AssistantMessage }
  | { type: "done"; reason: "stop" | "length" | "toolUse"; message: AssistantMessage }
  | { type: "error"; reason: "aborted" | "error"; error: AssistantMessage }
```

#### pi-server `/api/sessions/:id/history` 返回格式

```typescript
// 返回的是过滤后的 JSONL 条目
// runtime.ts:152 过滤逻辑：
//   entry.message?.role === 'user' ||
//   entry.message?.role === 'assistant' ||
//   entry.type === 'toolResult'
{ messages: [
  { message: { role: "user", content: "..." } },
  { message: { role: "assistant", content: [(TextContent | ThinkingContent | ToolCall)] } },
  { type: "toolResult", ... },
] }
```

### 具体差异点

| 维度 | lobe-ui ChatMessage | pi-server 消息 | 差异程度 |
|------|-------------------|----------------|---------|
| **role** | `'user'\|'assistant'\|'system'\|'function'` | `'user'\|'assistant'\|'toolResult'` | 中 — 需映射 `toolResult`→自定义渲染 |
| **content 格式** | `string`（纯文本/markdown） | `string \| (TextContent\|ImageContent\|ThinkingContent\|ToolCall)[]`（结构化数组） | **高** — assistant 的 content 是混合数组，不是字符串 |
| **ID** | 必须有 `id: string` | SSE 事件无 message id，history 也无 | 中 — 需要前端生成 |
| **元数据** | `meta: { avatar, title }` 必须 | 无 avatar/meta 概念 | 低 — 前端固定映射即可 |
| **时间戳** | `createAt`/`updateAt` (number) | `timestamp` (number, ms) | 低 — 字段名映射 |
| **流式更新** | `loadingId` 标记加载中的消息 | `message_update` 事件 + `AssistantMessageEvent` delta 流 | **高** — lobe-ui 不处理流式，只接受完整 content |
| **thinking** | 无原生支持 | `ThinkingContent` 在 content 数组中 | **高** — 需自定义渲染 |
| **tool call** | `function_call`（deprecated）/ `plugin` | `ToolCall` 在 content 数组 + 独立 `tool_execution_*` 事件 | **高** — 完全不同的模型 |
| **tool result** | 无独立消息类型 | `ToolResultMessage { role: "toolResult", content, details, isError }` | **高** — lobe-ui 无此概念 |
| **usage/cost** | 无 | `AssistantMessage.usage: { inputTokens, outputTokens, cacheRead, total }` | 中 — 需要自定义扩展 |
| **error** | `ChatMessageError { type, message, body }` | SSE `error` 事件 + `status` 事件 | 中 — 语义类似但结构不同 |

### 适配方案评估

#### 方案 A：直接依赖 `@lobehub/ui`，写适配层

```
pi-server SSE/History → 适配层 → lobe-ui ChatMessage[] → ChatList 渲染
```

**需要做的事：**

1. **消息转换器**：将 pi-agent 的 `AgentMessage` 转为 `ChatMessage`
   - `AssistantMessage.content` 数组 → 拼接为 markdown 字符串（丢失结构信息）
   - `ThinkingContent` → 用自定义 `renderMessages` 渲染
   - `ToolCall` → 用自定义 `renderMessages` 或 `renderItems` 渲染
   - `ToolResultMessage` → 映射为自定义 role，用 `renderItems` 渲染
   - 每条消息需生成 `id` 和 `meta`

2. **流式适配**：lobe-ui 的 `ChatList` 是纯展示组件，不管流式。需要自己用 SSE 事件实时拼接 content，更新 `ChatMessage[]` 状态

3. **自定义渲染**：通过 `renderMessages`/`renderItems`/`renderMessagesExtra` 注入：
   - ThinkingBlock（折叠推理过程）
   - ToolCallBlock（tool 调用可视化）
   - ToolResultBlock（执行结果展示）
   - Usage/Cost 显示

**能复用什么：**
- `ChatItem` 的布局（avatar + 气泡 + actions + 时间戳）
- `ChatList` 的列表渲染 + 历史分割线
- `ChatInputArea` + `ChatSendButton`
- `BackBottom`
- `EditableMessage` + `MessageModal`
- `Markdown` 组件（代码高亮、GFM、数学公式）
- `Highlighter`
- `TokenTag`
- `LoadingDots`
- 主题系统 (`ThemeProvider`)

**不能复用的（需要自建）：**
- 整个流式 SSE 状态管理
- ThinkingBlock
- ToolCall/ToolResult 渲染
- ModelSelector
- SessionList（lobe-ui 没有）
- 所有 pi-server 特有的 hook（useAuth, useSessions, useChat）

#### 方案 B：只依赖 lobe-ui 的子模块（cherry-pick）

```typescript
import { Markdown } from '@lobehub/ui'           // Markdown 渲染
import { Highlighter } from '@lobehub/ui'         // 代码高亮
import { ChatInputArea } from '@lobehub/ui/chat'  // 输入框
import { TokenTag } from '@lobehub/ui/chat'       // token 显示
import { BackBottom } from '@lobehub/ui/chat'     // 回到底部
import { ThemeProvider } from '@lobehub/ui'        // 主题
```

不用 `ChatList`/`ChatItem`，自己实现消息列表和消息渲染，避开消息格式适配。

**优点**：避开最重的适配工作（消息格式转换 + 流式拼接），但仍然带入 antd 依赖。

#### 方案 C：不依赖 lobe-ui 包，只参考设计移植（按需重写）

从 lobe-ui 源码中提取需要的组件，用 Tailwind 重写，去掉 antd-style 依赖。

#### 方案对比

| | 方案 A（全量引入） | 方案 B（子模块） | 方案 C（源码移植） |
|---|---|---|---|
| 适配工作量 | **高** — 消息转换器 + 流式拼接 + 自定义渲染 | **中** — 避开 ChatList 适配 | **低** — 按需重写 |
| 依赖负担 | **重** — antd + antd-style + 70+ deps | **重** — 同上（tree-shake 有限） | **无** |
| 与 Tailwind 冲突 | **有** — antd-style (CSS-in-JS) vs Tailwind | **有** — 同上 | **无** |
| 长期维护 | 受 lobe-ui 版本升级影响 | 同上 | 完全自主 |
| 开发速度 | 快（如果适配成功） | 中 | 慢（但可控） |

---

## 最终结论与引入策略

### 核心判断

1. **直接依赖 lobe-ui 的最大障碍不是消息格式**（适配层可以写），而是 **antd-style vs Tailwind 的样式方案冲突**。spec 明确选了 Tailwind + classNames API，引入 antd-style 等于维护两套样式系统。

2. **消息格式差异确实很大**，但核心矛盾在于 pi-agent 的 `AssistantMessage.content` 是结构化数组（TextContent + ThinkingContent + ToolCall 混排），而 lobe-ui 期望纯字符串。要用 lobe-ui 的 `ChatList`，必须要么把结构化 content 降级为字符串（丢失信息），要么通过 `renderMessages` 完全覆盖渲染逻辑（那 ChatItem 的 Markdown 渲染就没用了）。

3. **最值得引入的是 `Markdown` 和 `Highlighter`**，这两个组件不涉及消息格式，可以用在任何地方。但它们也带来 antd-style 依赖。

4. **推荐方案 C（源码移植）+ 独立引入 `react-markdown` + `shiki`**。从 lobe-ui 参考 ChatItem 的布局设计和交互模式，用 Tailwind 重写。Markdown 渲染直接用 `react-markdown` + `remark-gfm` + `shiki`（这些是 lobe-ui Markdown 组件的底层依赖，跳过 lobe-ui 这一层）。

### 补充要点

1. **Markdown 渲染不必重写，直接用底层库**。lobe-ui 的 Markdown 出色，但它本质是 `react-markdown` + `remark-gfm` + `remark-math` + `rehype-raw` + `shiki` 的封装。我们可以直接组合这些库，用 Tailwind 写 prose 样式，效果一样，省去 antd-style 依赖。这几个库加起来大约 100 行胶水代码。

2. **pi-webui 的 `AssistantMessageEvent` 流式协议是最大的复用价值**。它定义了 `text_delta`、`thinking_delta`、`toolcall_delta` 这套增量更新协议，我们的 SSE `pi` 事件就是透传这个。前端的流式状态机（如何把 delta 事件拼接成完整的 `AssistantMessage`）应该直接从 pi-webui 的 `StreamingMessageContainer` 中提取逻辑，这比参考 props 接口更关键。

3. **lobe-ui 有一个设计模式值得采纳：`renderMessages` / `renderItems` 按 role 分发渲染**。这个注册模式让 ChatList 不需要知道具体消息类型的渲染细节，扩展性好。我们可以用类似模式，但 role 映射到 pi-agent 的类型：`user` / `assistant` / `toolResult` / `thinking` / `toolExecution`。

4. **需要关注一个潜在陷阱：pi-server 的 history 接口返回的是原始 JSONL 条目，不是标准化的消息数组**。当前 `runtime.ts:152` 的过滤逻辑比较粗糙（只过滤 role=user/assistant 和 type=toolResult），且把整个 entry 原样返回。后续可能需要在 server 端做一次标准化，输出干净的 `AgentMessage[]`，而不是让前端去解析 JSONL 的各种 entry 格式。这个决定会影响 client 层 types 的设计。

### 推荐引入路线

**最终策略：方案 C（按需重写）— 从两个库汲取最优设计，用 Tailwind 统一实现。**

| 来源 | 复用内容 | 复用方式 |
|------|---------|---------|
| **pi-webui** | 消息组件 props 接口设计、流式状态机逻辑、ThinkingBlock、Tool 渲染注册机制、ModelSelector 交互设计、format.ts 工具函数 | 参考设计 + React 重写（format.ts 可直接复制） |
| **lobe-ui** | ChatItem 布局模式、renderMessages/renderItems 分发模式、BackBottom 交互、TokenTag 设计、暗色主题 CSS 变量方案、响应式断点策略 | 参考设计 + Tailwind 重写 |
| **底层库直接引入** | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-raw` + `shiki`（代码高亮）| 作为 @pi-server/ui 的 dependencies 直接安装 |

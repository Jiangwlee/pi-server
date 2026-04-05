# Backlog

## 模型选择器升级

**优先级**: 中
**状态**: 待定
**依赖**: 后端 Model 类型扩展

### 现状

当前 `ModelSelector` 是原生 `<select>` 下拉框，仅显示 `provider / name`。

### 目标

参考 pi-webui (`pi-mono/packages/web-ui/src/dialogs/ModelSelector.ts`) 的实现，升级为弹出面板式选择器。

### Gap 分析 (2026-04-05)

| 功能 | pi-webui | pi-server | 备注 |
|------|----------|-----------|------|
| 模糊搜索 | subsequence 算法 + 排序 | ❌ | 纯前端 |
| 能力过滤 | Thinking / Vision toggle | ❌ | 需后端扩展 Model |
| 模型元信息 | 上下文窗口、max tokens、费用 | ❌ | 需后端扩展 Model |
| 能力图标 | 🧠推理 🖼视觉，不支持时半透明 | ❌ | 需后端扩展 Model |
| 当前选中标记 | ✓ + 排序置顶 | ❌ | 纯前端 |
| Provider badge | outline 样式标签 | ❌ | 纯前端 |
| 键盘导航 | ↑↓/Enter/Escape + 自动滚动 | ❌ | 纯前端 |
| 鼠标/键盘模式切换 | 防止 hover 干扰键盘导航 | ❌ | 纯前端 |
| 弹出面板 | 独立 dialog | 原生 select | 纯前端 |

### 实施路径

**Phase 1 — 后端 Model 扩展**
- 从 pi SDK `ModelRegistry` 提取更多字段: `contextWindow`, `maxTokens`, `cost`, `reasoning`, `input` (支持的输入类型)
- 扩展 `/api/models` 响应和 `ui/client/types.ts` 的 `Model` 类型

**Phase 2 — 前端组件重写**
- 弹出面板 (Popover/Dialog) 替代原生 select
- 搜索输入框 + subsequence 模糊匹配
- Thinking / Vision 过滤 toggle
- 模型列表项: id + provider badge + 能力图标 + 费用 + context window
- 当前选中高亮 + 置顶
- 键盘导航 (↑↓ Enter Escape)
- 鼠标/键盘模式自动切换

### 参考

- pi-webui 实现: `pi-mono/packages/web-ui/src/dialogs/ModelSelector.ts`
- pi-webui 模糊搜索: `subsequenceScore()` 函数
- pi-webui 费用格式化: `formatModelCost()` in `utils/format.ts`

---

## pi-webui ��比完整 Gap 清单

对比基准: `pi-mono/packages/web-ui` (Lit web components, IndexedDB, v0.65.0)
对比日期: 2026-04-05
更新日期: 2026-04-05

### 架构差异（设计选择，非 gap）

| 维度 | pi-webui | pi-server |
|------|----------|-----------|
| 框架 | Lit web components | React |
| 存储 | IndexedDB (纯前端) | SQLite (后端持久化) |
| 认证 | API Key 自管理 | 服务端 session + OAuth |
| 模型访问 | 直连 provider API | 后端代理 + auth-proxy |
| 部署 | 静态 SPA | Docker (server + frontend) |

### 大 Gap

#### Artifacts 系统
- **pi-webui**: 完整的 ArtifactsPanel + 9 种 artifact 类型
  - HTML (sandbox iframe 执行 + 预览/代码切换 + console 输出)
  - SVG, Markdown, Image, Text (语法高亮), PDF, Excel, DOCX, Generic
  - Artifact tool commands: create/update/rewrite/get/delete/logs
  - ArtifactPill 浮动计数 badge
  - 50/50 分屏布局 (桌面) / overlay (移动端, 800px breakpoint)
  - 每种 artifact 有复制/下载按钮
  - SandboxedIframe + RuntimeProviders (artifacts/attachments/console/file-download)
- **pi-server**: ❌ 完全没有
- **工作量**: 大
- **参考**: `web-ui/src/tools/artifacts/`

#### 文档类文件处理
- **pi-webui**: 
  - PDF: 文本提取 (page markers) + canvas 多页预览 (1.5x scale)
  - DOCX: docx-preview 库渲染 + 文��提取
  - XLSX: XLSX 库 + sheet tabs + styled table cells
  - PPTX: 文本提取 (仅文字，无渲染)
  - 通用: extract-document tool 返回 XML 格式文本
  - AttachmentOverlay 全屏查看器: 原始视图 / 提取文本切换
- **pi-server**: ❌ 仅图片 (JPEG/PNG/GIF/WebP)
- **工作��**: 大
- **参考**: `web-ui/src/utils/attachment-utils.ts`, `web-ui/src/dialogs/AttachmentOverlay.ts`

#### Tool 渲染器注册表
- **pi-webui**: 
  - 可插拔 renderer registry: `registerToolRenderer(name, renderer)`
  - 内置渲染器: Bash (命令+输出), Calculate, GetCurrentTime, Artifacts
  - DefaultRenderer 兜底 (JSON 展开)
  - 三态显示: inprogress (脉冲动画) / complete / error (颜色区分)
  - collapsible header 模式
- **pi-server**: ❌ ToolCallBlock 仅显示 JSON，无状态区分
- **工作量**: 中
- **参考**: `web-ui/src/tools/renderer-registry.ts`, `web-ui/src/tools/renderers/`

#### Thinking Level 选择器
- **pi-webui**: Off/Minimal/Low/Medium/High 5 级下拉
  - 仅当 model.reasoning === true 时显示
  - 存储在 session metadata 中
  - 位于 MessageEditor 左侧按钮区
- **pi-server**: ❌ 没有
- **工作量**: 小 (pi SDK 已支持 ThinkingLevel)
- **前置**: 后端 Model 类型需扩展 reasoning 字段
- **参考**: `web-ui/src/components/MessageEditor.ts` L236-348

### 中 Gap

#### 模型选择器升级
- **状态**: 有独立分析，见上方 "模型选择器升级" section
- **工作量**: 中

#### 附件全屏查看
- **pi-webui**: AttachmentOverlay ��屏 dialog
  - 图片: 直接显示 + 缩放容器
  - PDF: canvas 多页渲染
  - DOCX: docx-preview 渲染
  - XLSX: sheet tabs + styled table
  - 模式切换: 原始视图 / 提取文本
  - 下载按钮 + 关闭 (X / Escape)
- **pi-server**: ❌ 仅 64px 缩略图，无点击查看
- **工作量**: 中 (图片先做较简单)
- **参考**: `web-ui/src/dialogs/AttachmentOverlay.ts`

#### Session 元数据丰富
- **pi-webui**: SessionListDialog 显示
  - 标题 (自动取首条消息)
  - 最后修改日期 (相对: Today/Yesterday/X days ago)
  - 消息数
  - 用量统计 (tokens + costs)
  - 预览文本 (前 2KB)
  - hover 显示删除按钮 + 确认
- **pi-server**: 仅 label + updatedAt
- **工作量**: 中

#### 费用追踪汇总 UI
- **pi-webui**: 
  - 每条消息显示 usage (input/output tokens + costs)
  - session 聚合费用
  - 可点击 cost 区域触发 onCostClick 回调
  - formatUsage(): "1.5K in, 2.3K out, $0.005"
- **pi-server**: 有 Usage 数据但无汇总 UI
- **工作量**: 小
- **参考**: `web-ui/src/utils/format.ts`

#### i18n 国际化
- **pi-webui**: 英/德双语, 200+ 翻译 key
  - `i18n(key)` 函数 + `setLanguage(lang)`
  - 覆盖: 编辑器操作、Provider 管理、Artifact 操作、设置、错误消息等
- **pi-server**: ❌ 硬编码英文
- **工作量**: 中

#### 设置面板
- **pi-webui**: SettingsDialog 多 tab
  - ApiKeysTab: 每 provider key 输入 + test/validate
  - ProxyTab: CORS proxy toggle + URL
  - ProvidersModelsTab: 云 + 自定义 provider 配置
- **pi-server**: ❌ 没有设置 UI (所有配置在环境变量)
- **工作��**: 中
- **备注**: pi-server 架构下 API key 由后端管理，设置面板内容不同

#### Console/输出块
- **pi-webui**: ConsoleBlock 组件
  - default/error 两种 variant (颜色区分)
  - 复制按钮 + "Copied!" 反馈
  - max-height 256px + 自动滚动到底部
- **pi-server**: ❌ 没有
- **工作量**: ���
- **参考**: `web-ui/src/components/ConsoleBlock.ts`

### 小 Gap

#### Escape 终止 streaming
- **pi-webui**: MessageEditor `handleKeyDown` 中 `Escape` → `onAbort?.()`
- **pi-server**: ❌ 仅 Stop 按钮
- **工作量**: 极小
- **参考**: `web-ui/src/components/MessageEditor.ts` L62-70

#### 代码块复制按钮
- **pi-webui**: ConsoleBlock/ArtifactElement 均有复制按钮 + "Copied!" toast
- **pi-server**: ❌ 没有
- **工作量**: 小

#### Dark/Light 主题切换 UI
- **pi-webui**: 内置 toggle (via @mariozechner/mini-lit)
- **pi-server**: 有 CSS 变量但无切换按���
- **工作量**: 极小

#### 图标库
- **pi-webui**: Lucide icons 全套 (Brain, Image, Paperclip, Send, Square, Sparkles, etc.)
- **pi-server**: ❌ 仅文字/emoji (📎)
- **工作量**: 小

#### Streaming 消息容器
- **pi-webui**: 独立 StreamingMessageContainer
  - requestAnimationFrame 批量更新
  - deep clone 检测嵌套属性变化
  - 脉冲动画
- **pi-server**: 直接在 messages 数组中修改 streaming message
- **工作量**: 小
- **备注**: 当前方案功能正确，优化级别差异

#### 智能自动滚动
- **pi-webui**: AgentInterface
  - 用户向上滚动时禁用��动滚动
  - 滚回底部附近时重新启用
  - ResizeObserver 检测内���变化
- **pi-server**: ❌ 无自动滚动管理
- **工作量**: 小

#### 附件缩略图组件
- **pi-webui**: AttachmentTile
  - 图片: 16x16 缩略图 + hover 放大
  - PDF: badge overlay
  - 文档: 图标 + 截断文件名
  - hover 显示删除按钮
  - 点击打开 AttachmentOverlay
- **pi-server**: AttachmentPreview 64x64 简单缩略图
- **工作量**: 小

### ✅ 已完成

| 功能 | 完成日期 | commit |
|------|----------|--------|
| 图片上传 (后端 + 前端) | 2026-04-05 | `12e6d4a` |
| 拖拽 + 剪贴板粘贴上传 | 2026-04-05 | `0f5171f` |

### ✅ pi-server 优势（pi-webui 没有的）

| 功能 | 说明 |
|------|------|
| 多用户 + 认证 | Email 密码 + GitHub OAuth，服务端 session |
| 后端文件持久化 | 文件存服务器磁盘，不占浏览器空间 |
| SSE 断线重连 | 环形缓冲 + Last-Event-ID |
| Markdown 流式高亮 | Shiki + shiki-stream 双路径 |
| AuthGuard 路由保护 | 前端路由级认证守卫 |
| Docker 部署 | 完整的容器化方案 |
| Session 后端持久化 | SQLite，跨设备可用 |

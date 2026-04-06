# pi-mono 工具渲染研究

> 研究日期：2026-04-06
> 目标：了解 pi-mono Web-UI 和 Coding-Agent 的工具渲染架构和模式

## 架构概览

pi-mono 采用**双平台**工具渲染系统：

| 平台 | 目录 | 框架 | 输出 |
|------|------|------|------|
| **Web-UI** | `packages/web-ui/src/tools/` | LitElement Web Components | HTML/DOM |
| **Coding-Agent** | `packages/coding-agent/src/core/tools/` | Pi-TUI | ANSI/Terminal |

两平台共享 **Strategy 模式** + fallback 链的渲染架构。

## Web-UI 渲染器

### Registry 机制

```
packages/web-ui/src/tools/
├── renderer-registry.ts    # Map<string, ToolRenderer> + renderTool() 入口
├── types.ts                # ToolRenderer / ToolRenderResult 接口
├── index.ts                # 注册所有 renderer
├── renderers/
│   ├── BashRenderer.ts
│   ├── CalculateRenderer.ts
│   ├── DefaultRenderer.ts
│   └── GetCurrentTimeRenderer.ts
├── javascript-repl.ts
├── extract-document.ts
└── artifacts/
    └── artifacts-tool-renderer.ts
```

**核心接口**：

```typescript
interface ToolRenderer<TParams = any, TDetails = any> {
  render(
    params: TParams | undefined,
    result: ToolResultMessage<TDetails> | undefined,
    isStreaming?: boolean
  ): ToolRenderResult
}

interface ToolRenderResult {
  content: TemplateResult   // Lit HTML 模板
  isCustom: boolean         // true = 不包裹 card
}
```

### 各 Renderer 行为

| Renderer | 渲染内容 | 特殊模式 |
|----------|----------|----------|
| **BashRenderer** | 命令 + ConsoleBlock 输出 | error 变体高亮 |
| **CalculateRenderer** | 内联 `expression = result` | 无 |
| **GetCurrentTimeRenderer** | 内联时间 + 时区 | 无 |
| **DefaultRenderer** | JSON 格式的 input/output | showJsonMode 调试开关 |
| **ArtifactsToolRenderer** | Diff 视图 / 代码块 / HTML logs | 可折叠，按命令类型分支（create/update/rewrite/get/delete/logs） |
| **javascriptReplRenderer** | 代码块 + console + 附件 tiles | 可折叠（max-h-0），base64 文件预览 |
| **extractDocumentRenderer** | URL + 语言检测 + 提取文本 | 可折叠，大小显示（KB） |

### 渲染状态

三状态 header：

```typescript
renderHeader(state, icon, text)
// state: "inprogress" → spinner | "complete" → green check | "error" → red icon
```

可折叠 header（artifacts、REPL、extract-document）：

```typescript
renderCollapsibleHeader(state, icon, text, contentRef, chevronRef, defaultExpanded?)
// CSS 过渡: max-h-0 overflow-hidden ↔ max-h-[2000px] mt-3
```

### Card 包裹控制

```typescript
// isCustom: false → 包裹在 <div class="p-2.5 border border-border rounded-md bg-card">
// isCustom: true  → 无包裹，renderer 自行负责样式
```

### 全局调试开关

```typescript
let showJsonMode = false
export function setShowJsonMode(enabled: boolean): void
// 强制所有工具使用 DefaultRenderer（JSON 模式）
```

## Coding-Agent TUI 渲染器

### 工具定义接口

```typescript
interface ToolDefinition<TParams, TDetails, TState> {
  name: string
  label: string
  // 渲染方法（可选）
  renderCall?(args, theme, context: ToolRenderContext): Component
  renderResult?(result, options: ToolRenderResultOptions, theme, context): Component
}

interface ToolRenderContext<TState, TArgs> {
  args: TArgs
  toolCallId: string
  invalidate: () => void
  state: TState
  executionStarted: boolean
  argsComplete: boolean
  isPartial: boolean      // streaming 中？
  expanded: boolean        // 用户手动展开？
  showImages: boolean
  isError: boolean
}

interface ToolRenderResultOptions {
  expanded: boolean
  isPartial: boolean
}
```

### 各工具渲染

| 工具 | 文件 | 渲染特点 |
|------|------|----------|
| **bash** | `core/tools/bash.ts` | 输出截断（tail 2000行/50KB），streaming 更新 |
| **read** | `core/tools/read.ts` | 输出截断（head 2000行/50KB），语法高亮 |
| **write** | `core/tools/write.ts` | 路径显示 + 写入确认 |
| **edit** | `core/tools/edit.ts` | Diff 视图（old_str → new_str） |
| **grep** | `core/tools/grep.ts` | 匹配高亮，长行截断（500 字符） |
| **find** | `core/tools/find.ts` | 文件列表，路径截断 |
| **ls** | `core/tools/ls.ts` | 目录列表 + 文件图标 |

### 截断系统

```typescript
// packages/coding-agent/src/core/tools/truncate.ts
const DEFAULT_MAX_LINES = 2000
const DEFAULT_MAX_BYTES = 50 * 1024  // 50KB

function truncateHead(content, options?): TruncationResult  // read 用
function truncateTail(content, options?): TruncationResult  // bash 用

interface TruncationResult {
  content: string
  truncated: boolean
  truncatedBy: "lines" | "bytes" | null
  totalLines: number
  totalBytes: number
  outputLines: number
  outputBytes: number
}

// 截断元数据存储在 details 中
interface BashToolDetails {
  truncation?: TruncationResult
  fullOutputPath?: string  // 完整输出路径
}
```

### TUI 背景色状态

```typescript
isPartial  → theme.bg("toolPendingBg")   // 灰色
isError    → theme.bg("toolErrorBg")      // 红色
complete   → theme.bg("toolSuccessBg")    // 绿色
```

### HTML 导出双视图

```typescript
// core/export-html/tool-renderer.ts
interface ToolHtmlRenderer {
  renderCall(toolCallId, toolName, args): string | undefined
  renderResult(toolCallId, toolName, result, details, isError):
    { collapsed?: string; expanded?: string } | undefined
}
```

## 关键设计模式

1. **Strategy + Registry**：Map 注册 + fallback 到 DefaultRenderer
2. **三状态渲染**：inprogress / complete / error
3. **可折叠**：Web-UI 用 CSS max-h-0 过渡，TUI 用 expanded boolean
4. **截断 + 元数据**：记录截断详情，提供完整输出路径
5. **Card 包裹控制**：isCustom flag 决定是否外包 card
6. **Renderer 优先链**：自定义扩展 → 内置定义 → 通用 fallback

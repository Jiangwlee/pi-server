# Tool Render Guide

本文档是开发 ToolRenderer 的完整参考。假设读者对 renderer 机制一无所知。

## 目录

- [架构概览](#架构概览)
- [核心概念](#核心概念)
- [接口定义](#接口定义)
- [数据流](#数据流)
- [样式约束](#样式约束)
- [RenderType 系统](#rendertype-系统)
- [图标映射](#图标映射)
- [开发一个 Renderer](#开发一个-renderer)
- [文件位置](#文件位置)

---

## 架构概览

工具渲染系统由两个正交维度决定：

- **What to render**：由数据类型决定（toolCall.name）→ 选择哪个 Renderer
- **How to render**：由 RenderType 决定（full / compact / highlight / inline）→ 同一 Renderer 的不同渲染模式

Renderer 负责**所有 tool-specific 的决策**（图标、状态文案、背景色、内容）。Timeline 是**纯布局容器**，不做任何 tool-specific 判断。

```
Renderer（工具相关）        Timeline（布局相关）
─────────────────        ─────────────────
icon                     Rail 连接线
status 文案               展开/折叠状态
surfaceBackground        hover 状态
content                  步骤定位（first/last）
                         Turn 级 header（StreamingHeader / CompletedHeader）
```

## 核心概念

### Renderer 的两个产出

一个 Renderer 对外提供两个方法，产出两种数据：

1. **`getMetadata(ctx)`** → `ToolRenderMetadata`：图标、状态文案、背景色等元数据。Timeline 子组件（TimelineRail、TimelineSurface、TimelineStepContent）消费这些数据来决定布局和样式。
2. **`render(ctx)`** → `ToolRenderResult`：实际渲染的 React 内容。ToolCallBlock 消费。

为什么拆成两个方法：metadata 的生命周期和 content 不同。图标在 toolCall 到达时就确定了，不随 result 变化；content 需要 result 数据。

### Registry 与 Fallback

- 通过 `registerToolRenderer(name, renderer)` 注册工具专用 renderer
- `getToolRenderer(name)` 查找注册的 renderer
- 未注册的工具 fallback 到 `defaultRenderer`（DefaultRenderer）
- DefaultRenderer 提供通用的 JSON input/output 视图

### Turn 级 vs Step 级

- **Turn 级**（ToolTimeline 管理）：StreamingHeader（"Executing bash..."）、CompletedHeader（"Thought for 5s"）。这是多个 step 的聚合信息，不属于 renderer 职责。
- **Step 级**（Renderer 管理）：每个 toolCall 的 icon、status、content。这是 renderer 的核心职责。

## 接口定义

### ToolRenderContext

Renderer 的两个方法都接收同一个 context：

```typescript
type ToolRenderContext = {
  toolCall: ToolCall          // 工具调用信息（name, id, arguments）
  result?: ChatMessage        // 工具返回结果（可能为 undefined，streaming 中）
  state: ToolRenderState      // 'inprogress' | 'complete' | 'error'
  renderType: RenderType      // 'full' | 'compact' | 'highlight' | 'inline'
}
```

### ToolRenderMetadata

Renderer 产出的元数据，由 Timeline 子组件消费：

```typescript
type ToolRenderMetadata = {
  icon: ComponentType<IconProps> | null   // Rail 图标。null = 不显示图标
  status: string | ReactNode             // Step header 文案
  surfaceBackground?: 'tint' | 'transparent' | 'error'  // 默认 'tint'
}
```

| 字段 | 消费者 | 默认值 |
|------|--------|--------|
| icon | TimelineRail | SvgCircle |
| status | TimelineStepContent header | toolCall.name |
| surfaceBackground | TimelineSurface + TimelineStepContent | 'tint' |

### ToolRenderResult

Renderer 产出的渲染内容：

```typescript
type ToolRenderResult = {
  content: ReactNode          // 实际渲染的 React 元素
  custom?: boolean            // 历史字段，所有 renderer 统一使用 true
}
```

### ToolRenderer 接口

```typescript
interface ToolRenderer {
  getMetadata?(ctx: ToolRenderContext): ToolRenderMetadata  // 可选，缺省 fallback 到 defaultRenderer
  render(ctx: ToolRenderContext): ToolRenderResult
  supportsRenderType?(renderType: RenderType): boolean
}
```

## 数据流

```
ToolTimeline
  └── steps.map(step => {
        const state = resolveState(...)
        const meta = getToolMetadata(toolCall, result, state)
        return <TimelineStep meta={meta} ... />
      })

TimelineStep（纯布局组合器，不做 tool-specific 判断）
  ├── TimelineRail
  │     └── meta.icon          ← 替代硬编码 StateIcon
  ├── TimelineSurface
  │     └── background={meta.surfaceBackground}  ← 替代硬编码 state 判断
  └── TimelineStepContent
        ├── header={meta.status}                  ← 替代硬编码 toolCall.name
        ├── collapsible（step 自管理折叠状态）
        └── <ToolCallBlock />                     ← render() 产出
```

## 样式约束

以下约束确保所有 renderer 的视觉风格统一。新 renderer 必须遵守。

### 1. 视觉容器由 Timeline 提供，Renderer 不包裹

Timeline 基础设施提供两层统一外观：

- **外层 TimelineSurface**：tint 灰底（`--tl-bg-tint-00`）+ hover 过渡
- **内层 TimelineStepContent**：header 行 + 白色圆角矩形内容区

```
TimelineSurface (tint 灰底)
└── TimelineStepContent
    ├── Header 行 (meta.status + 折叠按钮)
    └── Body (px-1 pb-1 外边距)
        └── 白色圆角矩形 (rounded-lg bg-white p-2.5)
            └── render() 产出的内容
```

**Renderer 的 render() 只输出工具特定内容**，不自己包裹 card、border、圆角矩形等容器。白色卡片由 TimelineStepContent 统一提供。所有 renderer 的 `custom` 统一为 `true`。

### 2. surfaceBackground 默认 tint

所有 renderer 非错误状态下使用 `tint`（灰底），错误状态使用 `error`（红底）。
不要使用 `transparent`，否则会与相邻 step 产生视觉割裂。

```typescript
surfaceBackground: ctx.state === 'error' ? 'error' : 'tint'
```

### 3. Header 显示摘要信息，Content 显示详情

- **header（meta.status）**：简短摘要，折叠时可读。例如 bash 的 `$ command`，file 的 `Read path`。
- **content（render()）**：展开后的详细数据。只包含 header 中没有的信息，不重复 header 内容。

### 4. Step 级折叠由 TimelineStep 管理

- streaming（inprogress）→ 展开
- 完成（complete/error）→ 自动折叠
- 用户手动点击可覆盖自动行为

Renderer 不需要自己实现折叠逻辑。

### 5. 文字样式使用 Timeline 令牌

| 用途 | 样式 |
|------|------|
| 正文内容 | `text-xs`（12px）、`var(--tl-text-03)` |
| 错误内容 | `text-xs`、`var(--danger, #ef4444)` |
| monospace 内容 | `font-mono text-xs leading-relaxed` |
| header 文案 | `text-sm`（14px）、`var(--tl-text-04)` — 由 TimelineStep 包裹 |

### 6. 不使用 inline style 做视觉布局

优先使用 Tailwind 类名（`flex`、`gap-2`、`text-xs`）。仅在引用 CSS 变量时使用 inline style。

## RenderType 系统

| RenderType | 用途 | 状态 |
|-----------|------|------|
| `full` | 展开的 timeline step，显示完整内容 | 已实现 |
| `compact` | 折叠 streaming bubble，截断显示 | 已实现 |
| `highlight` | 并行工具预览 | 预留 |
| `inline` | 搜索工具折叠视图 | 预留 |

Renderer 通过 `supportsRenderType(renderType)` 声明支持哪些模式。Timeline 据此决定是否显示特定 UI（如 CollapsedStreamingContent 仅在 renderer 支持 compact 时显示）。

## 图标映射

所有图标位于 `packages/ui/src/components/icons/`，来源 Onyx `@opal/icons`。

统一接口：`IconProps { size?: number } & SVGProps<SVGSVGElement>`，`stroke="currentColor"` 继承着色。

### 工具图标

| 图标 | 语义 | 对应工具 |
|------|------|----------|
| SvgTerminal | 终端/命令 | bash |
| SvgFileText | 文件 | read_file, write_file |
| SvgEditBig | 编辑 | edit_file |
| SvgSearch | 搜索 | grep, glob |
| SvgSearchMenu | 文档搜索 | 内部搜索（预留） |
| SvgGlobe | Web | web_search（预留） |
| SvgImage | 图片 | 图片生成（预留） |
| SvgActions | 自定义工具 | custom tool（预留） |
| SvgBookOpen | 阅读 | 研究/文档（预留） |

### 状态图标

| 图标 | 语义 | 使用场景 |
|------|------|----------|
| SvgCircle | 通用/默认 | fallback、DefaultRenderer |
| SvgCheckCircle | 完成 | 步骤完成状态 |

### 功能图标

| 图标 | 语义 | 使用场景 |
|------|------|----------|
| SvgMaximize2 | 最大化 | 展开按钮 |

## 开发一个 Renderer

### 第 1 步：创建 Renderer 文件

在 `packages/ui/src/components/chat/tools/renderers/` 下新建文件，如 `MyToolRenderer.tsx`。

### 第 2 步：实现 ToolRenderer 接口

```typescript
import type { ToolRenderer, ToolRenderContext, ToolRenderMetadata, ToolRenderResult } from '../types.js'
import SvgTerminal from '../../../icons/SvgTerminal.js'

function MyToolFullView({ ctx }: { ctx: ToolRenderContext }) {
  // 只渲染工具特定内容，不包裹容器
  return <pre className="m-0 font-mono text-xs leading-relaxed">{/* ... */}</pre>
}

function MyToolCompactView({ ctx }: { ctx: ToolRenderContext }) {
  return <div className="text-xs truncate" style={{ color: 'var(--tl-text-03)' }}>{/* ... */}</div>
}

export const myToolRenderer: ToolRenderer = {
  getMetadata(ctx: ToolRenderContext): ToolRenderMetadata {
    return {
      icon: SvgTerminal,
      status: '$ my-command',                                // 简短摘要
      surfaceBackground: ctx.state === 'error' ? 'error' : 'tint',  // 始终 tint
    }
  },

  render(ctx: ToolRenderContext): ToolRenderResult {
    if (ctx.renderType === 'compact') {
      return { content: <MyToolCompactView ctx={ctx} />, custom: true }
    }
    return { content: <MyToolFullView ctx={ctx} />, custom: true }  // 始终 custom: true
  },

  supportsRenderType(renderType) {
    return renderType === 'full' || renderType === 'compact'
  },
}
```

### 第 3 步：注册 Renderer

在 `packages/ui/src/components/chat/tools/register-builtins.ts` 中注册：

```typescript
import { registerToolRenderer } from './registry.js'
import { myToolRenderer } from './renderers/MyToolRenderer.js'

registerToolRenderer('my_tool', myToolRenderer)
```

### 第 4 步：验证

- `pnpm build` 无错误
- `pnpm test` 通过
- UI 上工具调用显示正确的图标和状态文案

## 文件位置

```
packages/ui/src/
├── components/
│   ├── icons/                          # SVG 图标组件
│   │   ├── types.ts                    # IconProps 接口
│   │   ├── Svg*.tsx                    # 各图标组件
│   │   └── index.ts                    # 统一导出
│   └── chat/
│       ├── tools/                      # Renderer 系统
│       │   ├── types.ts                # ToolRenderer / ToolRenderMetadata / ToolRenderResult
│       │   ├── registry.ts             # registerToolRenderer / getToolRenderer
│       │   ├── index.ts                # getToolMetadata() + renderTool() 入口
│       │   ├── register-builtins.ts    # 内置 renderer 自动注册（side-effect import）
│       │   └── renderers/
│       │       ├── DefaultRenderer.tsx  # 通用 fallback renderer
│       │       ├── BashRenderer.tsx     # bash 工具 renderer
│       │       └── ToolHeader.tsx       # StateIcon + ToolHeader 组件
│       ├── timeline/                   # Timeline 布局组件（纯布局，不做 tool-specific 判断）
│       │   ├── ToolTimeline.tsx         # 入口，调用 getToolMetadata()
│       │   ├── TimelineStep.tsx         # 布局组合器 + step 级折叠
│       │   ├── TimelineRail.tsx         # 左侧 icon + 连接线
│       │   ├── TimelineSurface.tsx      # 背景色容器
│       │   ├── TimelineStepContent.tsx  # header + 可折叠 body
│       │   ├── StreamingHeader.tsx      # Turn 级 streaming header
│       │   ├── CompletedHeader.tsx      # Turn 级 completed header
│       │   └── CollapsedStreamingContent.tsx  # 折叠态 compact bubble
│       └── ToolCallBlock.tsx           # 消费 render() 产出
└── client/
    └── types.ts                        # RenderType / ToolRenderState 类型定义
```

# Tool Render Guide

本文档是开发 ToolRenderer 的完整参考。假设读者对 renderer 机制一无所知。

## 目录

- [架构概览](#架构概览)
- [核心概念](#核心概念)
- [接口定义](#接口定义)
- [数据流](#数据流)
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
是否可折叠                Turn 级 header（StreamingHeader / CompletedHeader）
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
  supportsCollapsible?: boolean          // step 内容是否可折叠
  // 预留扩展
  alwaysCollapsible?: boolean            // 始终显示折叠按钮
  noPaddingRight?: boolean               // 去掉右侧 padding
  timelineLayout?: 'timeline' | 'content' // 布局模式
}
```

| 字段 | 消费者 | 默认值 |
|------|--------|--------|
| icon | TimelineRail | SvgCircle |
| status | TimelineStepContent header | toolCall.name |
| surfaceBackground | TimelineSurface | 'tint' |
| supportsCollapsible | TimelineStepContent | false |
| alwaysCollapsible | TimelineStepContent | false |
| noPaddingRight | TimelineStepContent | false |
| timelineLayout | TimelineStep | 'timeline' |

### ToolRenderResult

Renderer 产出的渲染内容：

```typescript
type ToolRenderResult = {
  content: ReactNode          // 实际渲染的 React 元素
  custom?: boolean            // true = 直接渲染；false = 包裹在默认 card 容器中
}
```

### ToolRenderer 接口

```typescript
interface ToolRenderer {
  getMetadata(ctx: ToolRenderContext): ToolRenderMetadata
  render(ctx: ToolRenderContext): ToolRenderResult
  supportsRenderType?(renderType: RenderType): boolean
}
```

## 数据流

```
ToolTimeline
  └── steps.map(step => {
        const renderer = getToolRenderer(name) ?? defaultRenderer
        const ctx = { toolCall, result, state, renderType }
        const meta = renderer.getMetadata(ctx)
        const rendered = renderer.render(ctx)
        return <TimelineStep meta={meta} rendered={rendered} ... />
      })

TimelineStep（纯布局组合器，不做 tool-specific 判断）
  ├── TimelineRail
  │     └── meta.icon          ← 替代硬编码 StateIcon
  ├── TimelineSurface
  │     └── background={meta.surfaceBackground}  ← 替代硬编码 state 判断
  └── TimelineStepContent
        ├── header={meta.status}                  ← 替代硬编码 toolCall.name
        ├── collapsible={meta.supportsCollapsible}
        └── rendered.content                      ← render() 产出
```

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

在 `packages/ui/src/components/chat/tools/renderers/` 下新建文件，如 `BashRenderer.tsx`。

### 第 2 步：实现 ToolRenderer 接口

```typescript
import type { ToolRenderer, ToolRenderContext, ToolRenderMetadata, ToolRenderResult } from '../types.js'
import { SvgTerminal } from '../../../icons/index.js'

export const bashRenderer: ToolRenderer = {
  getMetadata(ctx: ToolRenderContext): ToolRenderMetadata {
    return {
      icon: SvgTerminal,
      status: ctx.state === 'inprogress'
        ? 'Running command...'
        : ctx.state === 'error'
          ? 'Command failed'
          : 'Ran command',
      surfaceBackground: ctx.state === 'error' ? 'error' : 'tint',
      supportsCollapsible: true,
    }
  },

  render(ctx: ToolRenderContext): ToolRenderResult {
    if (ctx.renderType === 'compact') {
      return { content: <CompactView ctx={ctx} />, custom: true }
    }
    return { content: <FullView ctx={ctx} />, custom: false }
  },

  supportsRenderType(renderType) {
    return renderType === 'full' || renderType === 'compact'
  },
}
```

### 第 3 步：注册 Renderer

在 `packages/ui/src/components/chat/tools/registry.ts` 中注册：

```typescript
import { bashRenderer } from './renderers/BashRenderer.js'

registerToolRenderer('bash', bashRenderer)
```

### 第 4 步：验证

- `pnpm build` 无错误
- `pnpm test` 通过
- UI 上工具调用显示正确的图标和状态文案

### DefaultRenderer 参考实现

DefaultRenderer 是所有未注册工具的 fallback，也是新 renderer 的参考模板：

```typescript
export const defaultRenderer: ToolRenderer = {
  getMetadata(ctx) {
    return {
      icon: SvgCircle,
      status: ctx.toolCall.name,
      surfaceBackground: ctx.state === 'error' ? 'error' : 'tint',
      supportsCollapsible: false,
    }
  },
  render(ctx) {
    if (ctx.renderType === 'compact') {
      return { content: <CompactView ctx={ctx} />, custom: true }
    }
    return { content: <DefaultRendererView ctx={ctx} />, custom: false }
  },
  supportsRenderType(renderType) {
    return renderType === 'full' || renderType === 'compact'
  },
}
```

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
│       │   ├── index.ts                # renderTool() 入口 + re-exports
│       │   └── renderers/
│       │       ├── DefaultRenderer.tsx  # 通用 fallback renderer
│       │       ├── ToolHeader.tsx       # StateIcon + ToolHeader 组件
│       │       └── <ToolName>Renderer.tsx  # 工具专用 renderer
│       ├── timeline/                   # Timeline 布局组件（纯布局，不做 tool-specific 判断）
│       │   ├── ToolTimeline.tsx         # 入口，调用 renderer.getMetadata() + render()
│       │   ├── TimelineStep.tsx         # 布局组合器
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

# CollapsedStreamingContent + RenderType 系统

> 为 ToolTimeline 添加折叠状态下的 streaming bubble，同时引入 RenderType 系统让 ToolRenderer 支持多种渲染模式。

## 目录

- [设计方案](#设计方案)
  - [背景与目标](#背景与目标)
  - [RenderType 系统](#rendertype-系统)
  - [CollapsedStreamingContent 组件](#collapsedstreamingcontent-组件)
  - [数据流与层职责](#数据流与层职责)
  - [关键决策](#关键决策)
- [行动原则](#行动原则)
- [行动计划](#行动计划)
  - [文件结构设计](#文件结构设计)
  - [任务步骤](#任务步骤)

---

## 设计方案

### 背景与目标

Onyx AgentTimeline 在折叠状态下，streaming 时会在 header 下方以 bubble 形式显示当前 step 的紧凑内容。Pi-server 当前折叠状态下不显示任何内容。

**目标**：
1. 引入 RenderType 系统，让 ToolRenderer 根据渲染模式返回不同内容
2. 实现 CollapsedStreamingContent 组件，在折叠 streaming 时显示 compact bubble
3. DefaultRenderer 实现 full + compact 两种模式

**数据源确认**：SDK 的 bash 工具在执行过程中通过 `onUpdate` 回调持续 emit `tool_execution_update` 事件，`partialResult` 结构为 `{ content: [{ type: "text", text: "..." }], details: {...} }`，有实质内容（命令输出的滚动缓冲）。

### RenderType 系统

**两个正交维度**：
- **What to render**：由数据类型决定（message.role + ContentBlock.type + toolCall.name）
- **How to render**：由 RenderType 决定

```typescript
// client/types.ts（Transport 层）
type RenderType = 'full' | 'compact' | 'highlight' | 'inline'
```

| RenderType | 用途 | 状态 |
|-----------|------|------|
| `full` | 展开的 timeline step | 现有行为 |
| `compact` | 折叠 streaming bubble | 本次实现 |
| `highlight` | 并行工具预览 | 预留 |
| `inline` | 搜索工具折叠视图 | 预留 |

**ToolRenderer 接口变更**：

```typescript
type ToolRenderContext = {
  toolCall: ToolCall
  result?: ChatMessage
  state: ToolRenderState
  renderType: RenderType    // 新增
}

interface ToolRenderer {
  render(ctx: ToolRenderContext): ToolRenderResult
  supportsRenderType?(renderType: RenderType): boolean  // 可选
}
```

- `renderType` 通过 ctx 传入，现有 renderer 无需改签名
- `supportsRenderType()` 可选，用于判断是否显示 collapsed bubble
- DefaultRenderer 实现 full + compact

### CollapsedStreamingContent 组件

**显示条件**（在 ToolTimeline 中判断）：

```
isStreaming && !isExpanded && lastStep 有 partialResult && renderer 支持 compact
```

**布局结构**：

```
ToolTimeline
├── TimelineHeaderRow (avatar + StreamingHeader)    ← 现有
└── CollapsedStreamingContent                        ← 新增
    └── <div> (padding-left: rail-width)
        └── TimelineSurface (px-2 pb-2, roundedBottom)
            └── ToolCallBlock (renderType='compact')
```

- 左侧 padding 等于 rail 宽度（对齐），不使用 TimelineRail
- TimelineSurface 复用，roundedBottom 形成 bubble 底部圆角
- ToolCallBlock 传入 renderType='compact'

**DefaultRenderer compact 模式**：

| 模式 | 渲染内容 |
|------|---------|
| `full` | 现有行为不变 |
| `compact` | 只渲染 result 的 text content，截断显示。无 text 时 fallback 到 toolCall.name |

### 数据流与层职责

```
Transport              State                    Render
─────────         ─────────────────         ──────────────
SSE event    →    use-chat.ts               ToolTimeline
                  toolExecutions Map    →      ├── StreamingHeader
                  (partialResult 已存在)       ├── CollapsedStreamingContent (新)
                                              │     └── ToolCallBlock(renderType='compact')
                  resolveToolState()    →      │           └── renderer.render(ctx)
                                              └── [expanded steps]
```

| 层 | 新增 | 不做什么 |
|----|------|---------|
| **Transport** | `RenderType` 类型定义 | — |
| **State** | 无（partialResult 已在 toolExecutions Map） | 不判断 UI 展示决策 |
| **Render** | CollapsedStreamingContent、接口变更、DefaultRenderer compact | — |

### 关键决策

- **RenderType 定义在 Transport 层**：与 ToolRenderState 同层，各层通过 import 引用
- **"是否显示 bubble" 判断在 Render 层**：展开/折叠是 UI 状态，不是业务状态
- **Renderer 接口向后兼容**：renderType 通过 ctx 传入，supportsRenderType 可选，现有 renderer 无需改动
- **RenderType enum 完整定义**：4 种全部定义，但本次只实现 full + compact

---

## 行动原则

- **Break, Don't Bend**：直接修改 ToolRenderer 接口（新增 renderType 到 ctx），不建兼容层。**禁止：** 保留旧接口再包一层适配。
- **Zero-Context Entry**：CollapsedStreamingContent 文件头说明显示条件和布局结构。**禁止：** 文件无头部说明。
- **Minimum Blast Radius**：只添加 RenderType + CollapsedStreamingContent，不顺手重构现有 renderer。**禁止：** 修改 DefaultRenderer full 模式的现有行为。

---

## 行动计划

### 文件结构设计

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 修改 | `src/client/types.ts` | 新增 `RenderType` 类型定义 |
| 修改 | `src/components/chat/tools/types.ts` | `ToolRenderContext` 新增 `renderType`、`ToolRenderer` 新增 `supportsRenderType` |
| 修改 | `src/components/chat/tools/index.ts` | `renderTool()` 新增 `renderType` 参数 |
| 修改 | `src/components/chat/tools/renderers/DefaultRenderer.tsx` | 实现 compact 模式 |
| 新增 | `src/components/chat/timeline/CollapsedStreamingContent.tsx` | collapsed streaming bubble |
| 修改 | `src/components/chat/timeline/ToolTimeline.tsx` | 集成 CollapsedStreamingContent |
| 修改 | `src/components/chat/ToolCallBlock.tsx` | 传递 renderType |
| 修改 | `src/index.ts` | re-export RenderType |

### 任务步骤

#### Task 1: RenderType 类型定义

**Files:**
- 修改: `src/client/types.ts`
- 修改: `src/components/chat/tools/types.ts`
- 修改: `src/components/chat/tools/index.ts`
- 修改: `src/index.ts`

- [ ] **Step 1: 在 client/types.ts 定义 RenderType** (~1 min)

  ```typescript
  export type RenderType = 'full' | 'compact' | 'highlight' | 'inline'
  ```

- [ ] **Step 2: 更新 ToolRenderContext 和 ToolRenderer** (~2 min)

  `src/components/chat/tools/types.ts`：

  `ToolRenderContext` 新增字段：
  - `renderType: RenderType`（从 `client/types.js` 导入并 re-export）

  `ToolRenderer` 新增可选方法：
  - `supportsRenderType?(renderType: RenderType): boolean`

- [ ] **Step 3: 更新 renderTool() 入口** (~2 min)

  `src/components/chat/tools/index.ts`：
  - `renderTool()` 签名新增 `renderType: RenderType = 'full'` 参数
  - 传入 `ctx.renderType`

- [ ] **Step 4: 更新 re-export 链** (~1 min)

  检查 `src/client/index.ts` 是否有 `export * from './types.js'`，如无则添加。确认 `src/index.ts` 通过 `export * from './client/index.js'` 透传，使 `RenderType` 对外可用。

#### Task 2: DefaultRenderer compact 模式

**Files:**
- 修改: `src/components/chat/tools/renderers/DefaultRenderer.tsx`

- [ ] **Step 1: 读取 DefaultRenderer 当前实现** (~1 min)

- [ ] **Step 2: 添加 compact 渲染逻辑** (~3 min)

  检查 `ctx.renderType`：
  - `full`：现有行为不变
  - `compact`：只渲染 result 的 text content，单行截断。无 text content 时 fallback 到 toolCall.name
  - 边界：result 为 undefined 时显示 toolCall.name

- [ ] **Step 3: 实现 supportsRenderType** (~1 min)

  返回 `renderType === 'full' || renderType === 'compact'`

#### Task 3: ToolCallBlock 传递 renderType

**Files:**
- 修改: `src/components/chat/ToolCallBlock.tsx`

- [ ] **Step 1: 新增 renderType prop** (~2 min)

  props 新增 `renderType?: RenderType`（默认 `'full'`），传递给 `renderTool()`。

#### Task 4: CollapsedStreamingContent 组件

**Files:**
- 新增: `src/components/chat/timeline/CollapsedStreamingContent.tsx`

- [ ] **Step 1: 创建组件** (~5 min)

  Props（toolExecution 非 optional，显示条件已确保其存在）：
  ```typescript
  interface CollapsedStreamingContentProps {
    step: ToolStep
    toolExecution: ToolExecution  // 非 optional
  }
  ```

  文件头注释说明：
  - 显示条件：isStreaming && !isExpanded && partialResult 存在 && renderer 支持 compact
  - 布局：padding-left rail-width + TimelineSurface(px-2 pb-2, roundedBottom) + ToolCallBlock(compact)

  实现：
  - 外层 div：`pl-[var(--tl-rail-width)]`
  - TimelineSurface：`className="px-2 pb-2"` + `roundedBottom`
  - ToolCallBlock：`renderType="compact"`，`result` 取 `toolExecution.partialResult`

#### Task 5: ToolTimeline 集成

**Files:**
- 修改: `src/components/chat/timeline/ToolTimeline.tsx`

- [ ] **Step 1: 导入并集成 CollapsedStreamingContent** (~3 min)

  判断显示条件：
  ```typescript
  const lastStep = steps[steps.length - 1]
  const lastExecution = lastStep ? toolExecutions?.get(lastStep.toolCall.id) : undefined
  const showCollapsed = isStreaming && !isExpanded
    && !!lastExecution?.partialResult
    && rendererSupportsCompact(lastStep.toolCall.name)
  ```

  在 TimelineHeaderRow 之后插入：
  ```tsx
  {showCollapsed && <CollapsedStreamingContent step={lastStep} toolExecution={lastExecution} />}
  ```

- [ ] **Step 2: 实现 rendererSupportsCompact 辅助函数** (~2 min)

  ```typescript
  function rendererSupportsCompact(toolName: string): boolean {
    const renderer = getToolRenderer(toolName)
    if (renderer) return renderer.supportsRenderType?.('compact') ?? false
    // 未注册工具 fallback 到 defaultRenderer
    return defaultRenderer.supportsRenderType?.('compact') ?? true
  }
  ```

#### Task 6: 验证

- [ ] **Step 1: pnpm test** (~1 min)
- [ ] **Step 2: pnpm build** (~1 min)
- [ ] **Step 3: 确认 full 模式无破坏性变更** (~1 min)

#### Task 7: 完成核查

- [ ] **Step 1: 对照 spec 逐 Task 核查**

  逐一确认 Task 1-6 每个 Step 已完成。

- [ ] **Step 2: 对照设计方案验证无偏差**

  确认：
  - RenderType 4 种全部定义
  - ToolRenderer 接口变更正确
  - CollapsedStreamingContent 显示条件和布局与设计一致
  - DefaultRenderer full 模式行为未变

- [ ] **Step 3: 向用户汇报**

  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 未完成 Steps（如有）: [列举]
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ / ⚠️
  ```

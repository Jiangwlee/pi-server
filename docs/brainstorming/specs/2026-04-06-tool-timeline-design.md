# Tool Timeline

> 复刻 Onyx AgentTimeline 的视觉结构，将 assistant 消息中的 tool call 渲染为可折叠的时间线步骤，消费 SDK 已有的 tool_execution 生命周期事件实现实时进度更新。

## 目录

- [设计方案](#设计方案)
  - [背景与目标](#背景与目标)
  - [数据流](#数据流)
  - [组件架构](#组件架构)
  - [视觉结构](#视觉结构)
  - [状态机](#状态机)
  - [关键决策](#关键决策)
- [行动原则](#行动原则)
- [行动计划](#行动计划)
  - [文件结构设计](#文件结构设计)
  - [任务步骤](#任务步骤)

---

## 设计方案

### 背景与目标

Pi-server 当前将 tool call 渲染为内联卡片（ToolCallBlock），无折叠、无时间线视觉、无执行进度。Onyx 有完整的 AgentTimeline 系统（48 文件），提供 rail + surface 视觉结构、streaming header、折叠/展开控制。

**目标：** 复刻 Onyx 的视觉结构和交互模式，适配 pi-server 的数据模型（tool_execution 事件 + ToolRenderer registry）。

**成功标准：**
1. 多个 tool call 渲染为带左侧 rail 连接线的时间线步骤
2. Streaming 时显示 shimmer header + 实时计时
3. 完成后自动折叠为摘要行，点击可展开
4. tool_execution_update 的 partialResult 实时渲染在对应步骤中

### 数据流

```
SDK (agent-loop)
  ├── tool_execution_start   { toolCallId, toolName, args }
  ├── tool_execution_update  { toolCallId, toolName, args, partialResult }
  └── tool_execution_end     { toolCallId, toolName, result, isError }
        ↓ SSE 透传
use-chat.ts
  └── toolExecutions: Map<string, ToolExecution>
        ↓ 传递给组件
MessageItem (assistant message)
  └── 收集 content 中的 toolCall 块
        ↓
ToolTimeline
  ├── 从 toolExecutions 推导整体状态 (streaming / completed)
  ├── StreamingHeader / CompletedHeader
  └── TimelineStep × N
      └── ToolCallBlock(toolCall, result=partialResult|finalResult)
```

**ToolExecution 数据结构：**

```typescript
type ToolExecution = {
  toolCallId: string
  toolName: string
  state: ToolRenderState          // 复用现有类型: 'inprogress' | 'complete' | 'error'
  startTime: number
  partialResult?: ChatMessage     // tool_execution_update 的中间结果
}
```

**partialResult 转换：** `tool_execution_update` 的 `partialResult` 是 `AgentToolResult<T> = { content, details }`，与最终 result 同构。在 use-chat.ts 中转换为 `ChatMessage`：

```typescript
function toPartialChatMessage(event: {
  toolCallId: string; toolName: string; partialResult: unknown
}): ChatMessage {
  const pr = event.partialResult as { content?: unknown[]; details?: unknown }
  return {
    id: `partial-${event.toolCallId}`,
    role: 'tool',
    content: Array.isArray(pr?.content) ? parseContent(pr.content) : [],
    toolCallId: event.toolCallId,
    toolName: event.toolName,
    isError: false,
  }
}
```

`parseContent` 已在 use-chat.ts 中存在，用于 history 加载。此函数复用同一路径。

### 组件架构

```
ToolTimeline (业务组件 — 状态机 + 折叠控制 + 组合)
├── TimelineHeaderRow (primitive — avatar 列 + header 内容对齐)
│   ├── StreamingHeader (业务 — shimmer 文字 + elapsed timer + 折叠按钮)
│   └── CompletedHeader (业务 — 摘要文字 + 步骤计数 + 折叠按钮)
├── TimelineStep × N (业务 — 组合 Rail + Surface + StepContent)
│   ├── TimelineRail (primitive — 图标列 + 1px 连接线)
│   ├── TimelineSurface (primitive — 背景色 + 圆角 + hover)
│   └── TimelineStepContent (primitive — header 行 + 可折叠 body)
│       └── ToolCallBlock (现有组件 — 不改动)
└── 终止行 (✓ Done / ✗ Error)
```

**分层原则：**
- Primitives（4 个）：纯视觉，无业务逻辑，只接收 className/style props
- 业务组件（4 个）：消费数据、控制状态、组合 primitives

### 视觉结构

**Onyx 视觉复刻（ASCII）：**

```
┌─ ToolTimeline (CSS vars 注入) ──────────────────────────────┐
│  ┌─ TimelineHeaderRow ─────────────────────────────────────┐ │
│  │  [header content: StreamingHeader / CompletedHeader]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─ TimelineStep ──────────────────────────────────────────┐ │
│  │ Rail │ Surface                                          │ │
│  │  ○── │  ┌─ StepContent ──────────────────────────────┐  │ │
│  │  │   │  │ header: "bash"              [▼ collapse]   │  │ │
│  │  │   │  │ body: ToolCallBlock (渲染 partialResult)   │  │ │
│  │  │   │  └────────────────────────────────────────────┘  │ │
│  ├──┤───┤──────────────────────────────────────────────────┤ │
│  │  ●── │  ┌─ StepContent ──────────────────────────────┐  │ │
│  │  │   │  │ header: "read_file"                        │  │ │
│  │  │   │  │ body: ToolCallBlock                        │  │ │
│  │  │   │  └────────────────────────────────────────────┘  │ │
│  ├──┤───┤──────────────────────────────────────────────────┤ │
│  │  ✓   │  Done                                            │ │
│  └──┴───┴──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**CSS Variables（通过 ToolTimeline 根节点注入）：**

```typescript
const timelineTokens: Record<string, string> = {
  '--tl-rail-width': '2.25rem',
  '--tl-step-header-height': '2rem',
  '--tl-icon-size': '0.75rem',
  '--tl-connector-color': 'var(--color-border)',
  '--tl-surface-bg': 'var(--color-panel-elevated)',
  '--tl-surface-radius': '0.75rem',
  '--tl-step-top-padding': '0.25rem',
  '--tl-header-text-px': '0.375rem',
  '--tl-header-text-py': '0.125rem',
}
```

**图标状态映射（直接使用 ToolRenderState）：**

| ToolExecution.state | Rail 图标 | 说明 |
|---------------------|-----------|------|
| `inprogress` | ○ (虚线圆) | 复用导出的 StateIcon |
| `complete` | ✓ (实线勾) | 复用导出的 StateIcon |
| `error` | ✗ (实线叉) | 复用导出的 StateIcon |
| 无 execution 信息 | ○ | 回退到 `inprogress` |

**StateIcon 导出：** 当前 `StateIcon` 是 `ToolHeader.tsx` 的未导出内部函数。Task 1 Step 3 前需先将其导出为 `export function StateIcon`。

### 状态机

```
  tool_execution_start (任一 tool)
          ↓
      STREAMING
     shimmer header + 实时计时
     默认展开
          │
          │  所有 tool 的 state !== 'inprogress'
          ↓
      COMPLETED
     "Used N tools (Xs)" 摘要
     自动折叠
          ↕
     用户手动 toggle (尊重用户意图)
```

**折叠控制逻辑：**
- `isExpanded` 本地 state，初始 true
- streaming → completed 转换时：如果用户未手动操作过，自动折叠；如果用户手动展开过，保持展开
- 通过 `userToggledRef` 追踪用户是否手动操作过

**单个 tool call 的行为：** 不包裹 ToolTimeline，直接渲染 ToolCallBlock（保持现有行为）。只有 >= 2 个 tool call 时才启用 timeline 视觉。

### 关键决策

- **复刻 Onyx 视觉层级，不复刻 Onyx 数据架构**：Onyx 的 packet processor、turn/tab 分组、48 文件架构是为其专有数据模型服务的。pi-server 已有 tool_execution 事件 + ToolRenderer registry，只需复刻视觉 primitives。
- **partialResult 走现有 renderTool() 路径**：partialResult 与 finalResult 同构（AgentToolResult），转换为 ChatMessage 后传入 ToolCallBlock，不需要新的渲染路径。
- **CSS variables 而非 Tailwind arbitrary values**：timeline 尺寸需要多组件共享（rail 宽度影响图标列、连接线、header 对齐），CSS variables 是 Onyx 验证过的正确做法。
- **单个 tool call 不启用 timeline**：避免为单个工具调用增加不必要的视觉复杂度。
- **不实现 ParallelTimelineTabs**：pi-server 数据模型无 tab_index 概念，工具按出现顺序线性排列。

---

## 行动原则

- **TDD: Red → Green → Refactor**：先写失败测试再实现。**禁止：** 先写实现再补测试。
- **Break, Don't Bend**：直接适配 pi-server 数据模型，不为兼容 Onyx packet 类型建适配层。**禁止：** 引入 packet type enum 或 Onyx 数据结构。
- **Zero-Context Entry**：每个新文件前 20 行说明职责、props 接口、使用场景。**禁止：** 无头部说明的组件文件。
- **Minimum Blast Radius**：不改动 ToolCallBlock / DefaultRenderer / ToolHeader / registry。只新增组件 + 修改 use-chat.ts 和 MessageItem.tsx 的集成点。**禁止：** 顺手重构现有 tool 渲染链路。

---

## 行动计划

### 文件结构设计

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新增 | `packages/ui/src/components/chat/timeline/TimelineRail.tsx` | 左侧图标列 + 1px 连接线 |
| 新增 | `packages/ui/src/components/chat/timeline/TimelineSurface.tsx` | 背景容器 + 圆角 + hover |
| 新增 | `packages/ui/src/components/chat/timeline/TimelineStepContent.tsx` | header 行 + 可折叠 body |
| 新增 | `packages/ui/src/components/chat/timeline/TimelineHeaderRow.tsx` | header 对齐布局 |
| 新增 | `packages/ui/src/components/chat/timeline/TimelineStep.tsx` | 组合 Rail + Surface + StepContent |
| 新增 | `packages/ui/src/components/chat/timeline/StreamingHeader.tsx` | shimmer 文字 + elapsed timer |
| 新增 | `packages/ui/src/components/chat/timeline/CompletedHeader.tsx` | 完成摘要 + 步骤计数 |
| 新增 | `packages/ui/src/components/chat/timeline/ToolTimeline.tsx` | 入口组件 — 状态机 + 折叠控制 |
| 新增 | `packages/ui/src/components/chat/timeline/tokens.ts` | CSS variable 默认值 |
| 新增 | `packages/ui/src/components/chat/timeline/index.ts` | re-export |
| 修改 | `packages/ui/src/tools/renderers/ToolHeader.tsx` | 导出 StateIcon 供 TimelineRail 复用 |
| 修改 | `packages/ui/src/tools/index.ts` | re-export StateIcon |
| 修改 | `packages/ui/src/hooks/use-chat.ts` | 消费 tool_execution 事件，暴露 toolExecutions Map |
| 修改 | `packages/ui/src/components/chat/MessageItem.tsx` | 多 tool call 时包裹 ToolTimeline |
| 修改 | `packages/ui/src/components/chat/index.ts` | 导出 timeline 模块 |
| 新增 | `packages/ui/tests/components/chat/timeline/TimelineRail.test.tsx` | Rail primitive 测试 |
| 新增 | `packages/ui/tests/components/chat/timeline/TimelineStep.test.tsx` | Step 组合测试 |
| 新增 | `packages/ui/tests/components/chat/timeline/ToolTimeline.test.tsx` | 集成测试（状态机 + 折叠） |
| 新增 | `packages/ui/tests/components/chat/timeline/StreamingHeader.test.tsx` | Header 测试 |

### 任务步骤

#### Task 1: CSS tokens + Timeline primitives

**Files:**
- 新增: `timeline/tokens.ts`, `timeline/TimelineRail.tsx`, `timeline/TimelineSurface.tsx`, `timeline/TimelineStepContent.tsx`, `timeline/TimelineHeaderRow.tsx`
- 测试: `tests/.../timeline/TimelineRail.test.tsx`

- [ ] **Step 1: 写 TimelineRail 失败测试** (~3 min)

  测试用例：
  - 渲染图标 + 连接线（非首非末）
  - isFirst=true 时无上方连接线
  - isLast=true 时无下方连接线
  - 传入不同 state 渲染对应图标 (running/complete/error)

- [ ] **Step 2: 导出 StateIcon** (~2 min)

  修改 `packages/ui/src/tools/renderers/ToolHeader.tsx`：将 `function StateIcon` 改为 `export function StateIcon`。
  更新 `packages/ui/src/tools/index.ts`：添加 `export { StateIcon } from './renderers/ToolHeader.js'`。

- [ ] **Step 3: 实现 tokens.ts** (~2 min)

  ```typescript
  export const timelineTokenDefaults: Record<string, string>
  export function getTimelineStyles(overrides?: Partial<...>): React.CSSProperties
  ```
  导出 `--tl-*` CSS variables 默认值和合并函数。

- [ ] **Step 4: 实现 TimelineRail** (~5 min)

  ```typescript
  interface TimelineRailProps {
    state: ToolRenderState  // 'inprogress' | 'complete' | 'error'
    isFirst?: boolean
    isLast?: boolean
  }
  ```
  - 固定宽度 `w-[var(--tl-rail-width)]`
  - 上方连接线（1px，isFirst 时隐藏）
  - 居中图标（复用 ToolHeader 的 StateIcon 逻辑）
  - 下方连接线（flex-1，isLast 时隐藏）

- [ ] **Step 5: 实现 TimelineSurface** (~3 min)

  ```typescript
  interface TimelineSurfaceProps {
    children: ReactNode
    className?: string
    roundedTop?: boolean
    roundedBottom?: boolean
    background?: 'tint' | 'transparent' | 'error'
  }
  ```
  - 背景色映射到 pi-server 的 design tokens（tint → `bg-panel-elevated`）
  - 圆角 `rounded-xl`（top/bottom 独立控制）

- [ ] **Step 6: 实现 TimelineStepContent** (~3 min)

  ```typescript
  interface TimelineStepContentProps {
    header: ReactNode
    isExpanded?: boolean
    onToggle?: () => void
    collapsible?: boolean
    children?: ReactNode
  }
  ```
  - header 行：flex justify-between，左侧 header slot，右侧折叠按钮
  - body：isExpanded 时渲染 children

- [ ] **Step 7: 实现 TimelineHeaderRow** (~2 min)

  ```typescript
  interface TimelineHeaderRowProps {
    children: ReactNode
  }
  ```
  - flex 布局，左侧预留 rail 宽度空列，右侧 flex-1 放 header 内容

- [ ] **Step 8: 运行测试确认通过** (~1 min)

  ```bash
  pnpm --filter @pi-server/ui test -- --run tests/components/chat/timeline/
  ```

#### Task 2: StreamingHeader + CompletedHeader

**Files:**
- 新增: `timeline/StreamingHeader.tsx`, `timeline/CompletedHeader.tsx`
- 测试: `tests/.../timeline/StreamingHeader.test.tsx`

- [ ] **Step 1: 写 Header 失败测试** (~3 min)

  StreamingHeader 测试：
  - 渲染 shimmer 文字（检查 animate-shimmer class）
  - 显示 elapsed time
  - 折叠按钮 onClick 调用 onToggle

  CompletedHeader 测试：
  - 显示 "Used N tools (Xs)" 格式文字
  - 折叠按钮切换展开/收起图标

- [ ] **Step 2: 实现 StreamingHeader** (~5 min)

  ```typescript
  interface StreamingHeaderProps {
    toolName: string           // 当前正在执行的工具名
    startTime: number          // 用于计算 elapsed
    isExpanded: boolean
    onToggle: () => void
  }
  ```
  - shimmer 动画：通过 inline style 注入 keyframe（与 ToolHeader 的 Spinner 同模式），不依赖 Tailwind animate 插件。使用 `background: linear-gradient(90deg, ...) / background-size: 200% / background-clip: text / animation: shimmer 2s infinite`
  - elapsed timer：useEffect + setInterval，每秒更新
  - "Executing {toolName}..." 文字

- [ ] **Step 3: 实现 CompletedHeader** (~3 min)

  ```typescript
  interface CompletedHeaderProps {
    totalSteps: number
    durationSeconds: number
    isExpanded: boolean
    onToggle: () => void
  }
  ```
  - 折叠态："Used {N} tools ({X}s)"
  - 展开态：同上 + 折叠按钮图标变化

- [ ] **Step 4: 运行测试确认通过** (~1 min)

#### Task 3: TimelineStep + ToolTimeline

**Files:**
- 新增: `timeline/TimelineStep.tsx`, `timeline/ToolTimeline.tsx`, `timeline/index.ts`
- 测试: `tests/.../timeline/TimelineStep.test.tsx`, `tests/.../timeline/ToolTimeline.test.tsx`

- [ ] **Step 1: 写 TimelineStep 失败测试** (~3 min)

  - 组合渲染 Rail + Surface + StepContent
  - isFirst/isLast 传递给 Rail
  - 工具名显示在 header

- [ ] **Step 2: 写 ToolTimeline 失败测试** (~5 min)

  - streaming 状态：渲染 StreamingHeader + 展开的 steps
  - completed 状态：渲染 CompletedHeader + 折叠的 steps
  - toggle 操作：点击 header 切换展开/折叠
  - partialResult：传入 update 中间数据时渲染在对应 step 中

- [ ] **Step 3: 实现 TimelineStep** (~3 min)

  ```typescript
  interface TimelineStepProps {
    toolCall: ToolCall
    result?: ChatMessage           // partialResult 或 finalResult
    state: ToolRenderState  // 'inprogress' | 'complete' | 'error'
    streaming?: boolean
    isFirst?: boolean
    isLast?: boolean
    isExpanded?: boolean
    onToggle?: () => void
  }
  ```
  组合：`<div className="flex w-full"> <TimelineRail /> <TimelineSurface> <TimelineStepContent> <ToolCallBlock /> </TimelineStepContent> </TimelineSurface> </div>`

- [ ] **Step 4: 实现 ToolTimeline** (~5 min)

  ```typescript
  interface ToolTimelineProps {
    toolCalls: ToolCall[]
    toolResultsByCallId?: Map<string, ChatMessage>
    toolExecutions?: Map<string, ToolExecution>
    streaming?: boolean
    classNames?: ToolTimelineClassNames
  }
  ```
  - 状态机：从 toolExecutions 推导 isStreaming（任一 running）/ isCompleted
  - 折叠控制：isExpanded state + userToggledRef
  - CSS variables 注入 via `style={getTimelineStyles()}`
  - 渲染：TimelineHeaderRow + TimelineStep × N + 终止行

- [ ] **Step 5: 实现 index.ts 导出** (~1 min)

- [ ] **Step 6: 运行测试确认通过** (~1 min)

#### Task 4: use-chat.ts 集成 tool_execution 事件

**Files:**
- 修改: `packages/ui/src/hooks/use-chat.ts`
- 修改: `packages/ui/src/client/types.ts`（新增 ToolExecution 类型）

- [ ] **Step 1: 新增 ToolExecution 类型到 types.ts** (~2 min)

  ```typescript
  export type ToolExecution = {
    toolCallId: string
    toolName: string
    state: ToolRenderState  // 'inprogress' | 'complete' | 'error'
    startTime: number
    partialResult?: ChatMessage
  }
  ```

- [ ] **Step 2: use-chat.ts 消费事件** (~5 min)

  在 `switch (agentEvent.type)` 中替换 no-op：

  ```typescript
  case 'tool_execution_start': {
    const exec: ToolExecution = {
      toolCallId: agentEvent.toolCallId,
      toolName: agentEvent.toolName,
      state: 'inprogress',
      startTime: Date.now(),
    }
    setToolExecutions(prev => new Map(prev).set(agentEvent.toolCallId, exec))
    break
  }
  case 'tool_execution_update': {
    setToolExecutions(prev => {
      const next = new Map(prev)
      const existing = next.get(agentEvent.toolCallId)
      if (existing) {
        next.set(agentEvent.toolCallId, {
          ...existing,
          partialResult: toPartialChatMessage(agentEvent),
        })
      }
      return next
    })
    break
  }
  case 'tool_execution_end': {
    setToolExecutions(prev => {
      const next = new Map(prev)
      const existing = next.get(agentEvent.toolCallId)
      if (existing) {
        next.set(agentEvent.toolCallId, {
          ...existing,
          state: agentEvent.isError ? 'error' : 'complete',
        })
      }
      return next
    })
    break
  }
  ```

  辅助函数 `toPartialChatMessage(event)`：将 `partialResult` 转换为 `ChatMessage` 格式，与 `tool_execution_end` 的处理一致。

- [ ] **Step 3: 暴露 toolExecutions** (~2 min)

  在 useChat 返回值中新增 `toolExecutions`。在 session 切换 / agent_start / agent_end 时重置 Map（agent_end 触发 loadHistory，历史消息无 streaming 信息，stale 的 toolExecutions 会导致错误状态）。

- [ ] **Step 4: 运行现有测试确认无破坏** (~1 min)

  ```bash
  pnpm test
  ```

#### Task 5: MessageItem.tsx 集成 ToolTimeline

**Files:**
- 修改: `packages/ui/src/components/chat/MessageItem.tsx`
- 修改: `packages/ui/src/components/chat/index.ts`

- [ ] **Step 1: MessageItem assistant 分支改造** (~5 min)

  在 assistant message 渲染中：
  1. 遍历 `message.content`，将所有 `type === 'toolCall'` 的块收集到一个数组（忽略位置，不按连续性分组）
  2. 如果 toolCall 数量 >= 2：所有 toolCall 通过 `<ToolTimeline>` 渲染，非 toolCall 块（text/thinking/image）正常渲染在 timeline 外
  3. 如果 toolCall 数量 < 2：保持现有逐个 `<ToolCallBlock>` 渲染（timeline 不介入）
  4. 渲染顺序：按 content 数组原始顺序遍历，遇到第一个 toolCall 时插入 ToolTimeline（包含所有 toolCall），后续遇到的 toolCall 跳过

  新增 props：`toolExecutions?: Map<string, ToolExecution>`

- [ ] **Step 2: 更新 index.ts 导出** (~1 min)

  `export * from './timeline/index.js'`

- [ ] **Step 3: 运行全量测试** (~1 min)

  ```bash
  pnpm test
  pnpm build
  ```

- [ ] **Step 4: 提交** (~1 min)

  ```bash
  git add packages/ui/src/components/chat/timeline/ packages/ui/tests/components/chat/timeline/
  git add packages/ui/src/hooks/use-chat.ts packages/ui/src/client/types.ts
  git add packages/ui/src/components/chat/MessageItem.tsx packages/ui/src/components/chat/index.ts
  git commit -m "feat(ui): tool timeline with rail + surface visual structure and execution progress"
  ```

#### Task 6: 完成核查

**目的：** 防止 agent 虚报"任务完成"而实际存在遗漏或偏差。

- [ ] **Step 1: 对照 spec 逐 Task 核查**

  打开本文档的"任务步骤"列表，逐一确认每个 Task 的每个 Step 均已完成。

- [ ] **Step 2: 对照 spec 设计方案验证无偏差**

  重新阅读本文档"设计方案"章节，对比已实现内容，确认：
  - 视觉结构与 Onyx 一致（rail + surface + header）
  - CSS variables 通过根节点注入
  - partialResult 走现有 renderTool() 路径
  - 折叠逻辑尊重用户手动操作
  - 单个 tool call 不包裹 timeline

- [ ] **Step 3: 视觉验证**

  启动 dev 环境，发送触发多工具调用的消息，确认：
  - streaming 时 shimmer header + 实时计时
  - 完成后自动折叠
  - 展开/折叠交互正常
  - 左侧 rail 图标 + 连接线渲染正确

- [ ] **Step 4: 向用户汇报**

  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 未完成 Steps（如有）: [列举]
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ 全部完成，无偏差 / ⚠️ 存在问题（见上）
  ```

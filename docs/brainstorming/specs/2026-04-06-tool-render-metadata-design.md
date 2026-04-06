# ToolRenderMetadata 协议

> 将 tool-specific 的元数据（图标、状态文案、背景色）从 Timeline 硬编码移入 Renderer 产出，Timeline 变为纯布局容器。

## 目录

- [设计方案](#设计方案)
  - [背景与目标](#背景与目标)
  - [接口设计](#接口设计)
  - [数据流](#数据流)
  - [关键决策](#关键决策)
- [行动原则](#行动原则)
- [行动计划](#行动计划)
  - [文件结构设计](#文件结构设计)
  - [任务步骤](#任务步骤)

---

## 设计方案

### 背景与目标

当前 Timeline 组件中硬编码了 tool-specific 的信息：

- `TimelineStep` 硬编码 `toolCall.name` 作为 header 文案
- `TimelineStep` 硬编码 `state === 'error'` 判断 surface 背景色
- `TimelineRail` 硬编码 `StateIcon`（三种状态图标）

这导致添加新 renderer 时需要同时修改 Timeline 代码，职责不清晰。

**目标**：
1. Renderer 接口新增 `getMetadata()` 方法，产出 icon、status、surfaceBackground 等元数据
2. Timeline 子组件从 metadata 读取这些信息，不再硬编码
3. 改完后 UI 视觉行为完全不变

**不做**：
- 不改 Turn 级 header（StreamingHeader / CompletedHeader），它们聚合多个 step 的信息，属于 Timeline 职责
- 不改视觉效果，纯职责迁移

### 接口设计

**新增 ToolRenderMetadata 类型**（`tools/types.ts`）：

```typescript
import type { ComponentType } from 'react'
import type { IconProps } from '../../icons/types.js'

type ToolRenderMetadata = {
  icon: ComponentType<IconProps> | null
  status: string | ReactNode
  surfaceBackground?: 'tint' | 'transparent' | 'error'
  supportsCollapsible?: boolean
  // 预留扩展
  alwaysCollapsible?: boolean
  noPaddingRight?: boolean
  timelineLayout?: 'timeline' | 'content'
}
```

**ToolRenderer 接口变更**：

```typescript
interface ToolRenderer {
  getMetadata(ctx: ToolRenderContext): ToolRenderMetadata  // 新增
  render(ctx: ToolRenderContext): ToolRenderResult
  supportsRenderType?(renderType: RenderType): boolean
}
```

**新增 getToolMetadata() 入口函数**（`tools/index.ts`）：

```typescript
function getToolMetadata(
  toolCall: ToolCall,
  result: ChatMessage | undefined,
  streaming: boolean | undefined,
  renderType: RenderType = 'full',
): ToolRenderMetadata
```

与 `renderTool()` 对称，内部逻辑相同（查 registry → fallback defaultRenderer）。

### 数据流

**改前**（Timeline 硬编码）：

```
ToolTimeline → TimelineStep
  ├── TimelineRail(state)                        ← 硬编码 StateIcon
  ├── TimelineSurface(state==='error'?'error':'tint')  ← 硬编码判断
  └── TimelineStepContent(header=toolCall.name)   ← 硬编码文案
```

**改后**（Metadata 驱动）：

```
ToolTimeline
  └── steps.map(step => {
        const meta = getToolMetadata(toolCall, result, streaming)
        return <TimelineStep meta={meta} ... />
      })

TimelineStep
  ├── TimelineRail(icon={meta.icon}, state)
  ├── TimelineSurface(background={meta.surfaceBackground})
  └── TimelineStepContent(header={meta.status}, surfaceBackground={meta.surfaceBackground})
```

### 关键决策

- **getMetadata 独立于 render()**：元数据生命周期与 content 不同，icon 在 toolCall 到达时即确定，content 需要 result
- **Turn 级 header 留在 Timeline**：StreamingHeader / CompletedHeader 聚合多个 step 信息，不属于单个 renderer 职责
- **TimelineRail icon fallback**：传入 icon 时渲染传入组件，不传时 fallback 到现有 StateIcon，保证向后兼容
- **预留扩展字段**：supportsCollapsible / alwaysCollapsible / noPaddingRight / timelineLayout 定义但本次不实现消费端。supportsCollapsible 不接入 TimelineStepContent 的 collapsible（后者继续由 onToggle 驱动）
- **surfaceBackground 双传递**：meta.surfaceBackground 同时传给 TimelineSurface（背景色）和 TimelineStepContent（error 时显示 XOctagon 图标），保持 error 视觉完整

---

## 行动原则

- **Break, Don't Bend**：直接修改 ToolRenderer 接口新增 getMetadata()，不建兼容层。**禁止：** 保留旧接口再包适配。
- **Zero-Context Entry**：ToolRenderMetadata 类型定义处注释每个字段的消费者和默认行为。**禁止：** 字段无说明。
- **Minimum Blast Radius**：只移动职责（硬编码 → metadata），不改视觉效果。**禁止：** 顺手改样式或重构 renderer 内容。

---

## 行动计划

### 文件结构设计

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 修改 | `src/components/chat/tools/types.ts` | 新增 `ToolRenderMetadata`，`ToolRenderer` 新增 `getMetadata()` |
| 修改 | `src/components/chat/tools/renderers/DefaultRenderer.tsx` | 实现 `getMetadata()` |
| 修改 | `src/components/chat/tools/index.ts` | 新增 `getToolMetadata()` 入口函数 |
| 修改 | `src/components/chat/timeline/TimelineRail.tsx` | 新增 `icon` prop |
| 修改 | `src/components/chat/timeline/TimelineStep.tsx` | 接收 `meta` prop，移除硬编码 |
| 修改 | `src/components/chat/timeline/ToolTimeline.tsx` | 调用 `getToolMetadata()` 传递给 TimelineStep |
| 修改 | `tests/components/chat/timeline/ToolTimeline.test.tsx` | 适配新数据流 |

### 任务步骤

#### Task 1: 类型定义 + DefaultRenderer.getMetadata()

**Files:**
- 修改: `src/components/chat/tools/types.ts`
- 修改: `src/components/chat/tools/renderers/DefaultRenderer.tsx`
- 修改: `src/components/chat/tools/index.ts`

- [ ] **Step 1: types.ts 新增 ToolRenderMetadata** (~2 min)

  ```typescript
  import type { ComponentType, ReactNode } from 'react'
  import type { IconProps } from '../../icons/types.js'

  type ToolRenderMetadata = {
    /** TimelineRail 消费。null = 不显示图标 */
    icon: ComponentType<IconProps> | null
    /** TimelineStepContent header 消费 */
    status: string | ReactNode
    /** TimelineSurface 消费。默认 'tint' */
    surfaceBackground?: 'tint' | 'transparent' | 'error'
    /** TimelineStepContent 消费。默认 false */
    supportsCollapsible?: boolean
    // 预留
    alwaysCollapsible?: boolean
    noPaddingRight?: boolean
    timelineLayout?: 'timeline' | 'content'
  }
  ```

  ToolRenderer 接口新增：`getMetadata(ctx: ToolRenderContext): ToolRenderMetadata`

- [ ] **Step 2: DefaultRenderer 实现 getMetadata()** (~2 min)

  ```typescript
  getMetadata(ctx) {
    return {
      icon: SvgCircle,
      status: ctx.toolCall.name,
      surfaceBackground: ctx.state === 'error' ? 'error' : 'tint',
      supportsCollapsible: false,
    }
  }
  ```

- [ ] **Step 3: index.ts 新增 getToolMetadata()** (~2 min)

  与 `renderTool()` 对称：构建 ctx → 查 registry → fallback defaultRenderer → 调用 `getMetadata(ctx)`

#### Task 2: TimelineRail 接收 icon prop

**Files:**
- 修改: `src/components/chat/timeline/TimelineRail.tsx`

- [ ] **Step 1: 新增 icon prop** (~3 min)

  Props 新增 `icon?: ComponentType<IconProps>`。Icon wrapper 内：有 icon 时渲染 `<Icon size={12} />`（12px = 0.75rem = --tl-icon-size 默认值），无 icon 时 fallback 到现有 `<StateIcon state={state} isHover={isHover} />`。外层 wrapper div 已通过 CSS variable 控制容器尺寸，icon 组件只需填满。

#### Task 3: TimelineStep 接收 meta prop

**Files:**
- 修改: `src/components/chat/timeline/TimelineStep.tsx`

- [ ] **Step 1: 新增 meta prop，传递给子组件** (~3 min)

  Props 新增 `meta?: ToolRenderMetadata`（可选，向后兼容）。

  映射关系：
  - `<TimelineRail icon={meta?.icon} ...>`
  - `<TimelineSurface background={meta?.surfaceBackground ?? (state === 'error' ? 'error' : 'tint')} ...>`
  - `<TimelineStepContent header={meta?.status ?? toolCall.name} surfaceBackground={meta?.surfaceBackground ?? (state === 'error' ? 'error' : 'tint')} ...>`

  注意：surfaceBackground 同时传给 TimelineSurface 和 TimelineStepContent，后者用于 error 状态下显示 XOctagon 图标。collapsible 继续由 `!!onToggle` 驱动，不接入 meta.supportsCollapsible。

- [ ] **Step 2: 移除硬编码** (~2 min)

  当 meta 存在时，不再使用 `state === 'error' ? 'error' : 'tint'` 和 `toolCall.name`。保留无 meta 时的 fallback 路径（向后兼容）。

#### Task 4: ToolTimeline 集成

**Files:**
- 修改: `src/components/chat/timeline/ToolTimeline.tsx`

- [ ] **Step 1: steps.map 中调用 getToolMetadata()** (~3 min)

  ```typescript
  import { getToolMetadata } from '../tools/index.js'

  // 在 steps.map 内：
  const meta = getToolMetadata(step.toolCall, result, execution?.state === 'inprogress')
  return <TimelineStep meta={meta} ... />
  ```

#### Task 5: 验证

- [ ] **Step 1: pnpm build** (~1 min)
- [ ] **Step 2: pnpm test**（修复失败测试） (~3 min)
- [ ] **Step 3: 确认视觉行为无变化**（icon/文案/背景色与改前一致） (~1 min)

#### Task 6: 完成核查

- [ ] **Step 1: 逐 Task/Step 确认已完成**
- [ ] **Step 2: 对照设计方案验证无偏差**

  确认：
  - ToolRenderMetadata 类型完整定义（含预留字段）
  - DefaultRenderer.getMetadata() 实现正确
  - Timeline 子组件从 metadata 读取，无 tool-specific 硬编码
  - 视觉行为无变化

- [ ] **Step 3: 向用户汇报**

  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 未完成 Steps（如有）: [列举]
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ / ⚠️
  ```

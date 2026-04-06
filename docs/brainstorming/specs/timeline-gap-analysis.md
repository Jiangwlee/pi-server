# Timeline Gap 分析：Pi-Server vs Onyx

> 基于：onyx-timeline-layout.md, onyx-timeline-styles.md, pi-timeline-layout.md, pi-timeline-styles.md
> 生成日期：2026-04-06

---

## 1. TimelineHeaderRow

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 1.1 | 右列多余 padding | 右列：`flex-1 min-w-0 h-full`，**无 padding** | 右列：`flex flex-1 min-w-0 h-full items-center justify-between p-1`，多了 `p-1` (4px) |
| 1.2 | 右列多余圆角 | **无圆角** | `rounded-t-xl`，折叠时还加 `rounded-b-xl` |
| 1.3 | 右列不应有 hover 效果 | **无 hover** | JS onMouseEnter/Leave 设置 backgroundColor |
| 1.4 | 右列多余 transition | **无过渡** | `transition-colors duration-300` |
| 1.5 | 右列多余 flex 对齐 | 无 `items-center justify-between` | 有 `items-center justify-between`（这应该由 header 内部控制） |

### 样式 Gap

无额外样式差异（布局 gap 已涵盖全部问题）。

### 修复方向

右列应简化为 `flex-1 min-w-0 h-full`。去掉 `p-1`、`rounded-*`、hover、transition、`items-center justify-between`。

---

## 2. StreamingHeader

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 2.1 | 缺少 `collapsible` prop | 有 `collapsible` 控制是否显示按钮 | 按钮始终显示 |
| 2.2 | 缺少 `buttonTitle` prop | 支持自定义按钮文字 | 不支持 |
| 2.3 | 缺少 `toolProcessingDuration` | 后端 duration 可冻结 timer | 纯前端计时 |

### 样式 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 2.4 | 文字字重 | `mainUiAction` → **14px, weight 600** | `text-sm` → 14px, weight **400** |
| 2.5 | 文字颜色 | `text-text-03` → `--text-03` (55%/60% opacity) | 无颜色 class（shimmer 覆盖，但无 shimmer 时不匹配） |
| 2.6 | 按钮不是 tertiary Button | Onyx `<Button prominence="tertiary" size="md">` | 原生 `<button>` + 手写 class |
| 2.7 | 按钮圆角 | `rounded-08` (8px) | `rounded` (4px) |
| 2.8 | 按钮 hover 无背景色 | hover → `--background-tint-02` | 无 hover 背景 |
| 2.9 | 按钮文字颜色 | 默认 `--text-03`，hover `--text-04` | `text-muted/60`，hover `text-muted` |
| 2.10 | Shimmer 动画时长 | `1.8s ease-out` | `2s`（无 timing function） |
| 2.11 | Shimmer background-position | `100% 0 → -100% 0` | `200% 0 → -200% 0` |
| 2.12 | Shimmer fallback 颜色 | 无 fallback | `#a1a1aa` / `#d4d4d8`（与 globals.css 不匹配） |

---

## 3. CompletedHeader

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 3.1 | 缺少 `collapsible` prop | 有 `collapsible` 控制 | 按钮始终显示 |
| 3.2 | 展开/折叠显示不同文字 | 展开 → durationText，折叠 → imageText ?? durationText | 始终显示 durationText |
| 3.3 | 缺少 MemoryTag | 支持 `memoryOperation`、`memoryText` 等 | 不支持 |
| 3.4 | 缺少 generatedImageCount | 折叠时可显示 "Generated N images" | 不支持 |
| 3.5 | 多余的 tabIndex/onKeyDown | 无 tabIndex、无 onKeyDown | 有 `tabIndex={0}` + `onKeyDown` |
| 3.6 | 多余的 select-none/cursor-pointer | 无 | 有 `cursor-pointer select-none` |

### 样式 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 3.7 | 文字字重 | `mainUiAction` → **14px, weight 600** | `text-sm` → 14px, weight **400** |
| 3.8 | 文字颜色 | `text-text-03` → `--text-03` (55%) | `text-muted` → `--text-muted` (#a3a3a3) |
| 3.9 | 按钮同 StreamingHeader | Onyx tertiary Button | 原生 `<button>` + 手写 class |
| 3.10 | 按钮圆角 | 8px | 4px |
| 3.11 | 按钮 hover 无背景色 | 有 `--background-tint-02` | 无 |
| 3.12 | 按钮文字颜色 | `--text-03` / `--text-04` | `text-muted/60` / `text-muted` |

---

## 4. TimelineRail (对应 Onyx TimelineIconColumn)

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 4.1 | 缺少 `isHover` prop | connector 颜色随 hover 变化：`bg-border-01` → `bg-border-04` | 固定 `--tl-border-01`，无 hover |
| 4.2 | 缺少 spacer variant | `variant="spacer"` 只占位不画线 | 不支持 |
| 4.3 | 缺少 compact iconRowVariant | 高度切换到 `first-top-spacer-height`，只画线不画 icon | 不支持 |
| 4.4 | 缺少 `showIcon` prop | 可控制是否显示 icon | icon 始终显示 |
| 4.5 | 缺少 `disableTopConnectorHover` | 并行 tab 时 top connector 不跟随 hover | 无此概念 |
| 4.6 | connector 颜色用 inline style | Onyx 用 Tailwind class（`bg-border-01`） | Pi 用 inline style（`backgroundColor: var(--tl-border-01)`） |

### 样式 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 4.7 | icon 尺寸来源 | CSS 变量 `var(--timeline-icon-size)` | 硬编码 `size=12` |
| 4.8 | icon hover 颜色 | hover → `stroke-text-04` | 无 hover 变化 |

---

## 5. TimelineSurface

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 5.1 | 缺少 `isHover` prop | hover 时背景变为 `bg-background-tint-02` | 无 hover 效果 |
| 5.2 | empty children 返回 null | `React.Children.count(children) === 0` 返回 null | 不检查 |

### 样式 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 5.3 | tint 背景值不同 | `bg-background-tint-00` → Light: #ffffff, Dark: #000000 | `var(--tl-bg-tint-00)` → Light: rgba(0,0,0,0.02), Dark: rgba(255,255,255,0.03) |
| 5.4 | error 背景值不同 | `bg-status-error-00` → Light: #fef7f6, Dark: #210504 | `bg-red-500/[0.06]` |
| 5.5 | hover 背景缺失 | `bg-background-tint-02` → Light: #f0f0f1, Dark: #26262b | 无 |
| 5.6 | tint 实现方式 | Tailwind class | inline style |

**注意 5.3：** Onyx 的 `background-tint-00` 在 light 下是 `#ffffff`（纯白），在 dark 下是 `#000000`（纯黑），与页面背景融合。Pi 的 `--tl-bg-tint-00` 是半透明值 `rgba(0,0,0,0.02)`，在视觉上是微灰色。两者设计意图不同——Onyx 依赖 hover 时切换到 tint-02 来产生对比，Pi 依赖默认就有微灰底色。

---

## 6. TimelineStepContent

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 6.1 | 缺少 `hideHeader` | 可隐藏 header（单步时） | 不支持 |
| 6.2 | 缺少 `supportsCollapsible` | `collapsible && supportsCollapsible` 双条件 | 只有 `collapsible` |
| 6.3 | 缺少 `buttonTitle` | 按钮可带文字 | 只有 icon |
| 6.4 | 缺少 `noPaddingRight` | reasoning 内容去掉右 padding | 不支持 |
| 6.5 | 缺少 error 图标 | `surfaceBackground === "error"` 时显示 XOctagon 图标 | 无 |
| 6.6 | 缺少 `collapsedIcon` prop | 折叠时可自定义 icon | 固定 ExpandIcon |
| 6.7 | 右侧无固定宽度区域 | `w-[step-header-right-section-width]` (34px) 固定右栏 | `flex-none` 按钮 |

### 样式 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 6.8 | header 文字缺少 `pl-[common-text-padding]` | `pl-[var(--timeline-common-text-padding)]` (~2px) | 无此 padding |
| 6.9 | header 文字大小 | `mainUiMuted` → **14px** | `text-xs` → **12px** |
| 6.10 | header 文字颜色 | `text-text-04` → `--text-04` (75%) | `text-muted` → #a3a3a3 (更淡) |
| 6.11 | body 缺少右 padding | `pr-[step-header-right-section-width]` (34px) | 无 |

---

## 7. TimelineStep (对应 Onyx StepContainer)

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 7.1 | 缺少 `isHover` 联动 | 父组件传 `isHover`，icon + connector + surface 三者同步变色 | 无联动 hover |
| 7.2 | 缺少 `withRail` prop | 嵌套内容可不画 rail | 不支持 |
| 7.3 | 缺少 `surfaceBackground` prop 透传 | 透传给 Surface 和 StepContent | 只基于 state 判断 |
| 7.4 | icon 传递方式不同 | `stepIcon` 是组件 prop，由父级传入 | 固定使用 `StateIcon` |

### 样式 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 7.5 | Surface 缺少 `className="flex-1 flex flex-col"` | Onyx 给 Surface 传了 `className` | Pi 不传 className |
| 7.6 | Surface 缺少 roundedTop | Onyx 的 StepContainer 不传 roundedTop（只有 roundedBottom） | Pi 传了 `roundedTop={isFirst}` |

**注意 7.6：** Onyx 的 StepContainer 只对最后一个 step 加 `roundedBottom`，**不对第一个 step 加 roundedTop**。因为 Surface 的顶部是与 HeaderRow 紧贴的，不需要圆角。Pi 给第一个 step 加了 `roundedTop`，视觉上会有不必要的顶部圆角。

---

## 8. DoneStep

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 8.1 | 不复用 StepContainer | Onyx 复用 `<StepContainer stepIcon={SvgCheckCircle} header="Done">` | 独立实现 rail + surface 结构 |
| 8.2 | 缺少 StoppedStep | Onyx 支持 `<StepContainer stepIcon={SvgStopCircle} header="Stopped">` | 无 |

### 样式 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 8.3 | "Done" 文字大小 | `mainUiMuted` → **14px** | `text-xs` → **12px** |
| 8.4 | "Done" 文字颜色 | `text-text-04` → `--text-04` (75%) | `--tl-text-02` (45%) → 更淡 |
| 8.5 | header 文字 vs Text 组件 | 通过 StepContent 的 `<Text mainUiMuted text04>` | 直接 `<span>` |

---

## 9. ToolTimeline (对应 Onyx AgentTimeline)

### 功能 Gap

| # | Gap | Onyx | Pi-Server |
|---|-----|------|-----------|
| 9.1 | 缺少 StoppedHeader | 有 StoppedHeader（"Interrupted Thinking"） | 无 |
| 9.2 | 缺少 ParallelStreamingHeader | 并行步骤的 header | 无 |
| 9.3 | 缺少 CollapsedStreamingContent | 折叠时仍显示当前步骤的紧凑内容 | 折叠后完全隐藏 |
| 9.4 | 缺少 ParallelTimelineTabs | 并行步骤的 Tab 切换 | 无 |
| 9.5 | 缺少 TimelineRendererComponent | 动态渲染器查找 + expand/collapse 管理 | 固定使用 ToolCallBlock |
| 9.6 | 缺少 TimelineStepComposer | 渲染器结果的布局组合 | 无 |
| 9.7 | 多余的展开动画 | 无 `animate-in` | `animate-in fade-in slide-in-from-top-2 duration-300` |

### 样式 Gap

无额外样式差异（子组件的样式 gap 已在各组件中列出）。

---

## 10. CSS 变量体系

### 布局变量（tokens.ts）

| # | Gap | 说明 |
|---|-----|------|
| 10.1 | 变量前缀不同 | Onyx: `--timeline-*`，Pi: `--tl-*` |
| 10.2 | 6/16 变量未使用 | `--tl-top-connector-height`、`--tl-first-top-spacer-height`、`--tl-icon-size`、`--tl-branch-icon-size`、`--tl-step-header-right-section-width`、`--tl-common-text-padding` |

### 颜色变量（globals.css）

| # | Gap | 说明 |
|---|-----|------|
| 10.3 | 缺少 `--tl-text-03` | Header 文字、Button 文字颜色 (55%/60%) |
| 10.4 | 缺少 `--tl-text-05` | Button active 态颜色 (95%) |
| 10.5 | 缺少 `--tl-border-04` | Connector hover 颜色 |
| 10.6 | 缺少 `--tl-bg-tint-02` | Surface hover、Button hover 背景 |
| 10.7 | 缺少 `--tl-status-error-00` | Error surface 背景 |
| 10.8 | 缺少 `--tl-status-error-05` | Error 图标颜色 |
| 10.9 | `--tl-bg-tint-00` 值与 Onyx 不同 | Onyx Light: #ffffff / Dark: #000000。Pi Light: rgba(0,0,0,0.02) / Dark: rgba(255,255,255,0.03) |

---

## 汇总统计

| 分类 | 功能 Gap | 样式 Gap | 合计 |
|------|---------|---------|------|
| TimelineHeaderRow | 5 | 0 | 5 |
| StreamingHeader | 3 | 9 | 12 |
| CompletedHeader | 6 | 6 | 12 |
| TimelineRail | 6 | 2 | 8 |
| TimelineSurface | 2 | 4 | 6 |
| TimelineStepContent | 7 | 4 | 11 |
| TimelineStep | 4 | 2 | 6 |
| DoneStep | 2 | 3 | 5 |
| ToolTimeline | 7 | 0 | 7 |
| CSS 变量体系 | — | 9 | 9 |
| **合计** | **42** | **39** | **81** |

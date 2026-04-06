# Onyx Timeline 布局分析

> 来源：~/Github/onyx/web/src/app/app/message/messageComponents/timeline/
> 生成日期：2026-04-06

## 组件层级树

```
AgentTimeline (入口)
├── TimelineContainer (私有包装器)
│   ├── TimelineRoot (布局提供者，注入 CSS 变量)
│   └── TimelineHeaderRow (顶部 header 行)
│       ├── left slot → AgentAvatar (24px)
│       └── children → Header 内容（动态切换）
│             ├── StreamingHeader（流式状态）
│             ├── CompletedHeader（完成状态）
│             ├── StoppedHeader（中断状态）
│             └── ParallelStreamingHeader（并行流式）
│
├── CollapsedStreamingContent（折叠时的紧凑视图）
│   └── TimelineRow (railVariant="spacer")
│       └── TimelineSurface (px-2 pb-2 roundedBottom)
│           └── TimelineRendererComponent → 渲染器内容
│
└── ExpandedTimelineContent（展开时的完整视图）
    ├── ParallelTimelineTabs（并行步骤 → Tab 切换）
    │   └── TimelineRow → TimelineSurface → Tabs
    │
    └── TimelineStep[]（顺序步骤）
        └── TimelineRendererComponent
            └── TimelineStepComposer
                └── StepContainer[]
                    ├── TimelineRow
                    │   └── TimelineIconColumn（rail + icon + connectors）
                    └── TimelineSurface
                        └── TimelineStepContent（header + body）
```

## 逐组件布局规格

### 1. TimelineRoot

```tsx
<div
  className="flex flex-col pl-[var(--timeline-agent-message-padding-left)]"
  style={getTimelineStyles(tokens)}
>
  {children}
</div>
```

- 方向：垂直 flex column
- 左 padding：`--timeline-agent-message-padding-left` (0.12rem)
- 职责：注入全部 16 个 CSS layout 变量

### 2. TimelineHeaderRow

```tsx
<div className="flex w-full h-[var(--timeline-header-row-height)]">
  {/* 左列：avatar 区 */}
  <div className="flex items-center justify-center w-[var(--timeline-rail-width)] h-[var(--timeline-header-row-height)]">
    {left}  {/* AgentAvatar size=24 */}
  </div>
  {/* 右列：header 内容 */}
  <div className="flex-1 min-w-0 h-full">
    {children}
  </div>
</div>
```

- 方向：水平 flex row
- 高度：固定 `--timeline-header-row-height` (2.25rem = 36px)
- 左列宽度：`--timeline-rail-width` (2.25rem = 36px)，居中放 avatar
- 右列：flex-1，放 header 内容
- **注意：Onyx 的 HeaderRow 自身没有 hover 效果、没有圆角、没有背景色**

### 3. StreamingHeader

```tsx
<>
  <div className="px-[var(--timeline-header-text-padding-x)] py-[var(--timeline-header-text-padding-y)]">
    <Text as="p" mainUiAction text03 className="animate-shimmer ...">
      {headerText}
    </Text>
  </div>
  {collapsible && <Button prominence="tertiary" size="md" ... />}
</>
```

- 布局：Fragment，两个平级子元素（文字 + 按钮）
- 文字区 padding：`--timeline-header-text-padding-x` (0.375rem) / `--timeline-header-text-padding-y` (0.125rem)
- 按钮：Onyx tertiary Button（见样式分析）
- 三种按钮状态：
  1. 有 buttonTitle → `<Button rightIcon={Fold/Expand}>{buttonTitle}</Button>`
  2. 展开且有计时 → `<Button rightIcon={SvgFold}>{elapsed}</Button>`
  3. 其他 → `<Button icon={Fold/Expand} />`（纯图标）

### 4. CompletedHeader

```tsx
<div role="button" onClick={onToggle} className="flex items-center justify-between w-full">
  <div className="flex items-center gap-2 px-[var(--timeline-header-text-padding-x)] py-[var(--timeline-header-text-padding-y)]">
    <Text as="p" mainUiAction text03>
      {isExpanded ? durationText : imageText ?? durationText}
    </Text>
  </div>
  {collapsible && totalSteps > 0 && (
    <Button prominence="tertiary" size="md" onClick={onToggle} rightIcon={Fold/Expand}>
      {`${totalSteps} step(s)`}
    </Button>
  )}
</div>
```

- 整体可点击（role="button"）
- 方向：水平 flex，两端对齐（justify-between）
- 左侧：文字 + 可选 MemoryTag
- 右侧：tertiary Button 显示步骤数 + Fold/Expand 图标

### 5. StoppedHeader

```tsx
<div
  role={isInteractive ? "button" : undefined}
  className="flex items-center justify-between w-full rounded-12"
>
  <div className="px-[...] py-[...]">
    <Text as="p" mainUiAction text03>Interrupted Thinking</Text>
  </div>
  {isInteractive && <Button ... rightIcon={Fold/Expand}>N steps</Button>}
</div>
```

- 类似 CompletedHeader，但有 `rounded-12` 圆角
- 0 步骤时不可交互（aria-disabled）

### 6. TimelineRow

```tsx
<div className="flex w-full">
  {railVariant !== "none" && (
    <TimelineIconColumn variant={...} icon={...} ... />
  )}
  <div className="flex-1 min-w-0">
    {children}
  </div>
</div>
```

- 方向：水平 flex row
- 左：TimelineIconColumn（rail 或 spacer）
- 右：flex-1 内容区

### 7. TimelineIconColumn

**Spacer 模式：**
```tsx
<div className="w-[var(--timeline-rail-width)]" />
```

**Rail 模式 — default iconRowVariant：**
```tsx
<div className="relative flex flex-col items-center w-[var(--timeline-rail-width)]">
  <div className="w-full shrink-0 flex flex-col items-center h-[var(--timeline-step-header-height)]">
    {/* 上连接线 */}
    <div className="w-px h-[calc(var(--timeline-step-top-padding)*2)] {!isFirst && connectorColor}" />
    {/* 图标包装器 */}
    <div className="h-[var(--timeline-branch-icon-wrapper-size)] w-[var(--timeline-branch-icon-wrapper-size)] shrink-0 flex items-center justify-center">
      {showIcon && icon}
    </div>
    {/* header 内底部连接线 */}
    <div className="w-px flex-1 {connectorColor}" />
  </div>
  {/* 延伸到下一个 step 的连接线 */}
  {!isLast && <div className="w-px flex-1 {connectorColor}" />}
</div>
```

**Rail 模式 — compact iconRowVariant：**
```tsx
<div className="...">
  <div className="... h-[var(--timeline-first-top-spacer-height)]">
    <div className="w-px flex-1 {!isFirst && connectorColor}" />
  </div>
  {!isLast && <div className="w-px flex-1 {connectorColor}" />}
</div>
```

- connector 颜色：默认 `bg-border-01`，hover 时 `bg-border-04`
- 图标尺寸：`--timeline-icon-size` (0.75rem = 12px)
- 图标包装器：`--timeline-branch-icon-wrapper-size` (1.25rem = 20px)

### 8. TimelineSurface

```tsx
<div className={cn(
  "transition-colors duration-200",
  background === "tint" ? "bg-background-tint-00" : background === "error" ? "bg-status-error-00" : "",
  isHover && (background === "tint" || background === "error") ? "bg-background-tint-02" : "",
  roundedTop && "rounded-t-12",
  roundedBottom && "rounded-b-12",
  className
)}>
  {children}
</div>
```

- 过渡：`transition-colors duration-200`
- 背景：tint → `bg-background-tint-00`，error → `bg-status-error-00`
- Hover：`bg-background-tint-02`（覆盖 tint 和 error）
- 圆角：`rounded-t-12` / `rounded-b-12` (0.75rem = 12px)

### 9. TimelineStepContent

```tsx
<div className="flex flex-col px-1 pb-1">
  {/* Header 行 */}
  {!hideHeader && header && (
    <div className="flex items-center justify-between h-[var(--timeline-step-header-height)] pl-1">
      <div className="pt-[var(--timeline-step-top-padding)] pl-[var(--timeline-common-text-padding)] w-full">
        <Text as="p" mainUiMuted text04>{header}</Text>
      </div>
      <div className="h-full w-[var(--timeline-step-header-right-section-width)] flex items-center justify-end">
        {/* 折叠按钮或 error 图标 */}
      </div>
    </div>
  )}
  {/* 内容体 */}
  {children && (
    <div className={cn(
      "pl-1 pb-1",
      !noPaddingRight && "pr-[var(--timeline-step-header-right-section-width)]",
      hideHeader && "pt-[var(--timeline-step-top-padding)]"
    )}>
      {children}
    </div>
  )}
</div>
```

- 外层：`flex flex-col px-1 pb-1`
- Header 行高：`--timeline-step-header-height` (2rem = 32px)
- Header 左侧：`pl-1 pt-[step-top-padding] pl-[common-text-padding]`
- Header 右侧：固定宽 `--timeline-step-header-right-section-width` (2.125rem = 34px)
- 内容区右 padding：默认与右侧区域对齐（`pr-[step-header-right-section-width]`）

### 10. StepContainer

组合层——将 TimelineRow + TimelineSurface + TimelineStepContent 组装：

```tsx
<TimelineRow railVariant="rail" icon={iconNode} isFirst={...} isLast={...} isHover={...}>
  <TimelineSurface className="flex-1 flex flex-col" isHover={...} roundedBottom={isLastStep}>
    <TimelineStepContent header={...} isExpanded={...} onToggle={...} collapsible={...}>
      {children}
    </TimelineStepContent>
  </TimelineSurface>
</TimelineRow>
```

图标样式：
```tsx
<StepIconComponent className={cn(
  "h-[var(--timeline-icon-size)] w-[var(--timeline-icon-size)] stroke-text-02",
  isHover && "stroke-text-04"
)} />
```

### 11. DoneStep / StoppedStep

复用 StepContainer：
```tsx
<StepContainer stepIcon={SvgCheckCircle} header="Done" isLastStep={true} isFirstStep={false} />
<StepContainer stepIcon={SvgStopCircle} header="Stopped" isLastStep={true} isFirstStep={false} />
```

### 12. ExpandedTimelineContent

```tsx
<div className="w-full">
  {turnGroups.map(group =>
    group.isParallel ? <ParallelTimelineTabs /> : group.steps.map(step => <TimelineStep />)
  )}
  {showDoneStep && <StepContainer stepIcon={SvgCheckCircle} header="Done" />}
  {showStoppedStep && <StepContainer stepIcon={SvgStopCircle} header="Stopped" />}
</div>
```

## CSS 布局变量（16 个）

| 变量名 | 默认值 | 像素值 | 用途 |
|--------|--------|--------|------|
| `--timeline-rail-width` | 2.25rem | 36px | 左侧 rail 列宽 |
| `--timeline-header-row-height` | 2.25rem | 36px | 顶部 header 行高 |
| `--timeline-step-header-height` | 2rem | 32px | step header 行高 |
| `--timeline-top-connector-height` | 0.5rem | 8px | 上连接线高度 |
| `--timeline-first-top-spacer-height` | 0.25rem | 4px | 首项顶部间距 |
| `--timeline-icon-size` | 0.75rem | 12px | 图标尺寸 |
| `--timeline-branch-icon-wrapper-size` | 1.25rem | 20px | 图标包装器尺寸 |
| `--timeline-branch-icon-size` | 0.75rem | 12px | 分支图标尺寸 |
| `--timeline-step-header-right-section-width` | 2.125rem | 34px | step header 右区宽度 |
| `--timeline-header-padding-left` | 0.5rem | 8px | header 左 padding |
| `--timeline-header-padding-right` | 0.25rem | 4px | header 右 padding |
| `--timeline-header-text-padding-x` | 0.375rem | 6px | header 文字水平 padding |
| `--timeline-header-text-padding-y` | 0.125rem | 2px | header 文字垂直 padding |
| `--timeline-step-top-padding` | 0.25rem | 4px | step 顶部 padding |
| `--timeline-agent-message-padding-left` | 0.12rem | ~2px | 整体左 padding |
| `--timeline-common-text-padding` | 0.12rem | ~2px | 通用文字 padding |

# Pi-Server Timeline 布局分析

> 来源：packages/ui/src/components/chat/timeline/
> 生成日期：2026-04-06

## 组件层级树

```
ToolTimeline (入口)
├── TimelineHeaderRow
│   ├── left slot → AgentAvatar (24px OnyxIcon)
│   └── children → StreamingHeader OR CompletedHeader
│
└── Animated div (条件: isExpanded)
    ├── TimelineStep[] (每个工具调用)
    │   ├── TimelineRail
    │   │   ├── Top connector (1px line)
    │   │   ├── StateIcon (12px, 3 states)
    │   │   └── Bottom connectors (1px lines)
    │   └── TimelineSurface
    │       └── TimelineStepContent
    │           ├── Header row (tool name + toggle button)
    │           └── Content (ToolCallBlock, 条件: isExpanded)
    └── DoneStep (条件: completed + expanded)
        ├── Rail (connector + CheckCircleIcon)
        └── Surface ("Done" text)
```

## 逐组件布局规格

### 1. ToolTimeline（入口）

```tsx
<div
  className="flex flex-col pl-[var(--tl-agent-message-padding-left)]"
  style={getTimelineStyles()}
  data-testid="tool-timeline"
>
  <TimelineHeaderRow left={<AgentAvatar size={24} />} showRoundedBottom={!isExpanded}>
    {isStreaming ? <StreamingHeader .../> : <CompletedHeader .../>}
  </TimelineHeaderRow>

  {isExpanded && (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      {steps.map(...) => <TimelineStep .../>}
      {showDoneStep && <DoneStep />}
    </div>
  )}
</div>
```

- 方向：垂直 flex column
- 左 padding：`--tl-agent-message-padding-left` (0.12rem ≈ 2px)
- 注入全部 16 个 CSS layout 变量
- 展开动画：`animate-in fade-in slide-in-from-top-2 duration-300`

**状态管理：**
- `isExpanded` — 默认 true，streaming 结束自动折叠（除非用户手动 toggle 过）
- `isStreaming` — 从 toolExecutions map 推导
- `showDoneStep` — `!isStreaming && isExpanded && steps.length > 0`

### 2. TimelineHeaderRow

```tsx
<div className="flex w-full h-[var(--tl-header-row-height)]" data-testid="timeline-header-row">
  <div className="flex items-center justify-center w-[var(--tl-rail-width)] h-[var(--tl-header-row-height)]">
    {left}  {/* AgentAvatar */}
  </div>
  <div
    className="flex flex-1 min-w-0 h-full items-center justify-between p-1 rounded-t-xl transition-colors duration-300 {showRoundedBottom ? 'rounded-b-xl' : ''}"
    onMouseEnter → backgroundColor = 'var(--tl-bg-tint-00, rgba(0,0,0,0.02))'
    onMouseLeave → backgroundColor = ''
  >
    {children}
  </div>
</div>
```

- 方向：水平 flex row
- 高度：`--tl-header-row-height` (2.25rem = 36px)
- 左列：`--tl-rail-width` (2.25rem = 36px)，居中放 avatar
- 右列：flex-1，padding `p-1` (4px)，`rounded-t-xl`
- Hover：通过 JS onMouseEnter/Leave 设置 backgroundColor
- 过渡：`transition-colors duration-300`

### 3. StreamingHeader

```tsx
<>
  <ShimmerKeyframes />
  <div className="px-[var(--tl-header-text-px)] py-[var(--tl-header-text-py)]">
    <span className="text-sm" style={{ shimmer gradient + animation }}>
      Executing {toolName}...
    </span>
  </div>
  {isExpanded && elapsed > 0 ? (
    <button className="flex items-center gap-1 text-xs text-muted/60 hover:text-muted px-1.5 py-0.5 rounded ...">
      <span>{elapsed}</span> <FoldIcon />
    </button>
  ) : (
    <button className="flex items-center text-muted/60 hover:text-muted px-1 py-0.5 rounded ...">
      {FoldIcon or ExpandIcon}
    </button>
  )}
</>
```

- Fragment 包裹，两个平级子元素
- 文字 padding：`--tl-header-text-px` (6px) / `--tl-header-text-py` (2px)
- Shimmer：inline style gradient + `tl-shimmer 2s infinite`
- 按钮：原生 `<button>`，手写样式

### 4. CompletedHeader

```tsx
<div role="button" tabIndex={0} onClick={onToggle}
     className="flex items-center justify-between w-full cursor-pointer select-none">
  <div className="flex items-center gap-2 px-[var(--tl-header-text-px)] py-[var(--tl-header-text-py)]">
    <span className="text-sm text-muted">{durationText}</span>
  </div>
  <button className="flex items-center gap-1 text-xs text-muted/60 hover:text-muted px-1.5 py-0.5 rounded ...">
    <span>{stepsLabel}</span> {FoldIcon or ExpandIcon}
  </button>
</div>
```

- 整体可点击（role="button"）
- 方向：水平 flex，justify-between
- 左侧文字：`text-sm text-muted`
- 右侧按钮：原生 `<button>`

### 5. TimelineStep

```tsx
<div className="flex w-full" data-testid="timeline-step">
  <TimelineRail state={state} isFirst={isFirst} isLast={isLast} />
  <TimelineSurface roundedTop={isFirst} roundedBottom={isLast} background={error ? 'error' : 'tint'}>
    <TimelineStepContent header={<span className="text-xs text-muted">{toolCall.name}</span>}
                         collapsible={!!onToggle} isExpanded={isExpanded} onToggle={onToggle}>
      <ToolCallBlock toolCall={toolCall} result={result} streaming={streaming} />
    </TimelineStepContent>
  </TimelineSurface>
</div>
```

- 方向：水平 flex row
- 左：TimelineRail
- 右：TimelineSurface > TimelineStepContent > ToolCallBlock

### 6. TimelineRail

```tsx
<div className="relative flex flex-col items-center w-[var(--tl-rail-width)]">
  <div className="w-full shrink-0 flex flex-col items-center h-[var(--tl-step-header-height)]">
    {/* Top connector */}
    <div className="w-px" style={{ height: calc(step-top-padding * 2), bg: isFirst ? transparent : --tl-border-01 }} />
    {/* Icon wrapper */}
    <div className="shrink-0 flex items-center justify-center"
         style={{ width/height: --tl-branch-icon-wrapper-size }}>
      <StateIcon state={state} />
    </div>
    {/* Bottom connector within header */}
    <div className="w-px flex-1" style={{ bg: --tl-border-01 }} />
  </div>
  {/* Bottom connector to next step */}
  {!isLast && <div className="w-px flex-1" style={{ bg: --tl-border-01 }} />}
</div>
```

- 宽度：`--tl-rail-width` (36px)
- Icon row 高度：`--tl-step-header-height` (32px)
- Connector 颜色：`var(--tl-border-01, #e6e6e6)`（固定，无 hover 变化）
- 首项 top connector：transparent
- 末项 bottom connector：不渲染

### 7. TimelineSurface

```tsx
<div className="flex-1 min-w-0 transition-colors duration-200 {bgClass} {rounded}"
     style={background === 'tint' ? { bg: --tl-bg-tint-00 } : undefined}>
  {children}
</div>
```

- 背景 tint：`var(--tl-bg-tint-00, rgba(0,0,0,0.02))` via inline style
- 背景 error：`bg-red-500/[0.06]` via Tailwind class
- 圆角：`rounded-t-xl` / `rounded-b-xl`
- 过渡：`transition-colors duration-200`
- **无 isHover prop，无 hover 背景变化**

### 8. TimelineStepContent

```tsx
<div className="flex flex-col px-1 pb-1">
  <div className="flex items-center justify-between h-[var(--tl-step-header-height)] pl-1">
    <div className="pt-[var(--tl-step-top-padding)] flex-1 min-w-0">
      {header}
    </div>
    {collapsible && (
      <button className="flex-none flex items-center justify-center text-muted/60 hover:text-muted p-1 ...">
        {FoldIcon or ExpandIcon}
      </button>
    )}
  </div>
  {isExpanded && children && (
    <div className="pl-1 pb-1">{children}</div>
  )}
</div>
```

- 外层：`flex flex-col px-1 pb-1` (4px 水平, 4px 底)
- Header 行高：`--tl-step-header-height` (32px)
- Header 左侧 padding：`pl-1` (4px) + `pt-[step-top-padding]` (4px)
- 右侧：无固定宽度区域，用 `flex-none` 按钮
- Content：`pl-1 pb-1` (4px)
- **无 `--tl-common-text-padding` 使用**
- **无 `--tl-step-header-right-section-width` 使用**
- **无 `pr-[right-section-width]` content 右 padding**

### 9. DoneStep

```tsx
<div className="flex w-full">
  {/* Rail */}
  <div className="relative flex flex-col items-center w-[var(--tl-rail-width)]">
    <div className="w-full shrink-0 flex flex-col items-center h-[var(--tl-step-header-height)]">
      <div className="w-px" style={{ height: calc(step-top-padding*2), bg: --tl-border-01 }} />
      <div style={{ width/height: --tl-branch-icon-wrapper-size }}>
        <CheckCircleIcon />  {/* 12px, color: --tl-text-02 */}
      </div>
    </div>
  </div>
  {/* Content */}
  <div className="flex-1 min-w-0 rounded-b-xl transition-colors duration-200"
       style={{ bg: --tl-bg-tint-00 }}>
    <div className="flex items-center h-[var(--tl-step-header-height)] pl-2">
      <span className="text-xs" style={{ color: --tl-text-02 }}>Done</span>
    </div>
  </div>
</div>
```

- 独立实现 rail 结构（不复用 TimelineRail/TimelineSurface/StepContainer）
- 始终显示 top connector（非 isFirst）
- 无 bottom connector（始终是最后一步）
- "Done" 文字：`text-xs`（12px），颜色 `--tl-text-02`

### 10. AgentAvatar

```tsx
<div className="flex items-center justify-center" style={{ width: size, height: size }}>
  <svg width={size} height={size} viewBox="0 0 56 56" fill="currentColor"
       style={{ color: 'var(--tl-text-04, rgba(0,0,0,0.75))' }}>
    <path d="M27.9998 0L10.8691 7.76944..." />
  </svg>
</div>
```

- 尺寸：默认 24px
- OnyxIcon 菱形 SVG
- 颜色：`--tl-text-04` (75% opacity light / 85% opacity dark)

## CSS 布局变量

| 变量名 | 默认值 | 像素值 | 实际使用 |
|--------|--------|--------|---------|
| `--tl-rail-width` | 2.25rem | 36px | ✅ TimelineHeaderRow, TimelineRail, DoneStep |
| `--tl-header-row-height` | 2.25rem | 36px | ✅ TimelineHeaderRow |
| `--tl-step-header-height` | 2rem | 32px | ✅ TimelineRail, TimelineStepContent, DoneStep |
| `--tl-top-connector-height` | 0.5rem | 8px | ❌ 未使用（用 calc(step-top-padding*2) 代替） |
| `--tl-first-top-spacer-height` | 0.25rem | 4px | ❌ 未使用 |
| `--tl-icon-size` | 0.75rem | 12px | ❌ 未使用（StateIcon 硬编码 12px） |
| `--tl-branch-icon-wrapper-size` | 1.25rem | 20px | ✅ TimelineRail, DoneStep |
| `--tl-branch-icon-size` | 0.75rem | 12px | ❌ 未使用 |
| `--tl-step-header-right-section-width` | 2.125rem | 34px | ❌ 未使用 |
| `--tl-header-padding-left` | 0.5rem | 8px | ❌ 未使用 |
| `--tl-header-padding-right` | 0.25rem | 4px | ❌ 未使用 |
| `--tl-header-text-px` | 0.375rem | 6px | ✅ StreamingHeader, CompletedHeader |
| `--tl-header-text-py` | 0.125rem | 2px | ✅ StreamingHeader, CompletedHeader |
| `--tl-step-top-padding` | 0.25rem | 4px | ✅ TimelineRail, TimelineStepContent, DoneStep |
| `--tl-agent-message-padding-left` | 0.12rem | ~2px | ✅ ToolTimeline root |
| `--tl-common-text-padding` | 0.12rem | ~2px | ❌ 未使用 |

**6/16 个变量未被使用。**

# Onyx Timeline 样式分析

> 来源：~/Github/onyx/ 多个文件
> 生成日期：2026-04-06

## 1. 颜色体系

### Light Mode (`:root`)

| 语义名 | CSS 变量 | 值 | 说明 |
|--------|----------|-----|------|
| text-02 | `--text-02` | `#00000073` (black 45%) | 图标 stroke、最低对比文字 |
| text-03 | `--text-03` | `#0000008c` (black 55%) | Button tertiary 文字、header 文字 |
| text-04 | `--text-04` | `#000000bf` (black 75%) | Step header 文字、hover 态 icon |
| text-05 | `--text-05` | `#000000f2` (black 95%) | Button active 态文字 |
| border-01 | `--border-01` | `#e6e6e6` | Connector 线默认色 |
| border-04 | `--border-04` | `#808080` | Connector 线 hover 色 |
| background-tint-00 | `--background-tint-00` | `#ffffff` | Surface 默认背景 |
| background-tint-02 | `--background-tint-02` | `#f0f0f1` | Surface hover 背景 / Button hover 背景 |
| status-error-00 | `--status-error-00` | `#fef7f6` | Error surface 背景 |
| status-error-05 | `--status-error-05` | `#dc2626` | Error 图标颜色 |
| shimmer-base | `--shimmer-base` | `#a3a3a3` | Shimmer 渐变基色 |
| shimmer-highlight | `--shimmer-highlight` | `#000000` | Shimmer 渐变高亮色 |

### Dark Mode (`.dark`)

| 语义名 | CSS 变量 | 值 | 说明 |
|--------|----------|-----|------|
| text-02 | `--text-02` | `#ffffff73` (white 45%) | 同上 |
| text-03 | `--text-03` | `#ffffff99` (white 60%) | 同上 |
| text-04 | `--text-04` | `#ffffffd9` (white 85%) | 同上 |
| text-05 | `--text-05` | `#fffffff2` (white 95%) | 同上 |
| border-01 | `--border-01` | `#333333` | 同上 |
| border-04 | `--border-04` | `#b2b2b2` | 同上 |
| background-tint-00 | `--background-tint-00` | `#000000` | 同上 |
| background-tint-02 | `--background-tint-02` | `#26262b` | 同上 |
| status-error-00 | `--status-error-00` | `#210504` | 同上 |
| status-error-05 | `--status-error-05` | `#dc2626` | 同上（不变） |
| shimmer-base | `--shimmer-base` | `#5c5c5c` | 同上 |
| shimmer-highlight | `--shimmer-highlight` | `#ffffff` | 同上 |

## 2. 字体体系

### 字体家族

| 变量 | 值 |
|------|-----|
| `--font-hanken-grotesk` | "Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif |
| `--font-dm-mono` | "DM Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace |

### Text 组件变体

| 变体名 | 字体 | 大小 | 字重 | 行高 | 用于 |
|--------|------|------|------|------|------|
| `mainUiAction` | Hanken Grotesk | 14px | 600 (semibold) | 20px | Header 文字（Thought for...、Executing...） |
| `mainUiMuted` | Hanken Grotesk | 14px | 400 (normal) | 20px | Step header 文字（工具名） |
| `secondaryAction` | Hanken Grotesk | 12px | 600 (semibold) | 16px | Button 内文字 |

### 颜色变体（叠加在字体变体上）

| 颜色名 | Tailwind class | 实际颜色 |
|--------|----------------|---------|
| `text03` | `text-text-03` | Light: `#0000008c` / Dark: `#ffffff99` |
| `text04` | `text-text-04` | Light: `#000000bf` / Dark: `#ffffffd9` |

### Timeline 中的字体使用

| 位置 | 字体变体 + 颜色 | 效果 |
|------|-----------------|------|
| StreamingHeader 文字 | `mainUiAction` + `text03` | 14px semibold, 55% opacity, 带 shimmer |
| CompletedHeader 文字 | `mainUiAction` + `text03` | 14px semibold, 55% opacity |
| StoppedHeader 文字 | `mainUiAction` + `text03` | 14px semibold, 55% opacity |
| Step header 文字 | `mainUiMuted` + `text04` | 14px normal, 75% opacity |
| Button 文字 | CSS class (非 Text 组件) | 见 Button 样式 |

## 3. Button 组件样式（prominence="tertiary" size="md"）

### 尺寸 (size="md")

| 属性 | 值 |
|------|-----|
| padding | `p-1` = 0.25rem (4px) all sides |
| border-radius | `rounded-08` = 0.5rem (8px) |
| gap | 0 |
| 文字 padding | `py-0.5` = 0.125rem (2px) top/bottom |

### 颜色状态 (prominence="tertiary")

| 状态 | 背景色 | 文字颜色 | 图标 stroke |
|------|--------|---------|------------|
| 默认 | transparent | `--text-03` | `--text-03` |
| hover | `--background-tint-02` | `--text-04` | `--text-04` |
| active | `--background-tint-00` | `--text-05` | — |
| disabled | transparent | `--text-01` | — |

### Button 内部结构

```
[padding: 4px] [icon?] [content padding: 2px top/bottom] [text] [rightIcon?] [/padding]
```

- `rightIcon` 模式：文字在左，图标在右（如 "3 steps ▼"）
- `icon` 模式：仅图标，无文字（如 "▼"）

## 4. 图标样式

### Step 图标（rail 中的圆形图标）

```tsx
<StepIconComponent className={cn(
  "h-[var(--timeline-icon-size)] w-[var(--timeline-icon-size)] stroke-text-02",
  isHover && "stroke-text-04"
)} />
```

| 属性 | 值 |
|------|-----|
| 尺寸 | `--timeline-icon-size` = 0.75rem (12px) |
| stroke 颜色（默认） | `stroke-text-02` → `--text-02` (45% opacity) |
| stroke 颜色（hover） | `stroke-text-04` → `--text-04` (75% opacity) |
| fill | none（纯 stroke 图标） |

### Header 中的 Fold/Expand 图标

- 通过 Button 组件渲染
- 图标颜色跟随 Button 状态：默认 `--text-03`，hover `--text-04`
- 使用 SvgFold（向上箭头 = 折叠）和 SvgExpand（向下箭头 = 展开）

### Error 图标

```tsx
<SvgXOctagon className="h-4 w-4 text-status-error-05" />
```

- 尺寸：16px × 16px
- 颜色：`--status-error-05` (#dc2626)
- 位置：step header 右侧区域

## 5. Connector 线样式

| 属性 | 值 |
|------|-----|
| 宽度 | 1px (`w-px`) |
| 默认颜色 | `bg-border-01` (Light: #e6e6e6, Dark: #333333) |
| Hover 颜色 | `bg-border-04` (Light: #808080, Dark: #b2b2b2) |
| 上连接线高度 | `calc(var(--timeline-step-top-padding) * 2)` = 0.5rem (8px) |
| 首项上连接线 | 不渲染（`!isFirst && colorClass`） |
| 末项下连接线 | 不渲染（`!isLast && ...`） |

Hover 时 connector 颜色变化逻辑：
- `isHover` 由父组件（StepContainer）传入
- `disableTopConnectorHover`：并行 tab 的 top connector 不跟随 hover

## 6. Surface 样式

| 属性 | 默认 tint | error | hover (tint/error) |
|------|-----------|-------|--------------------|
| 背景色 | `bg-background-tint-00` | `bg-status-error-00` | `bg-background-tint-02` |
| 圆角（顶） | `rounded-t-12` (12px) | 同 | 同 |
| 圆角（底） | `rounded-b-12` (12px) | 同 | 同 |
| 过渡 | `transition-colors duration-200` | 同 | 同 |

**Light 实际值：**
- tint 默认：#ffffff（与页面背景融合，几乎不可见）
- tint hover：#f0f0f1（微灰）
- error：#fef7f6（极淡红）

**Dark 实际值：**
- tint 默认：#000000（与页面背景融合）
- tint hover：#26262b（微亮）
- error：#210504（极暗红）

## 7. Shimmer 动画

### 定义

```css
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
```

### 使用

```tsx
<Text className="animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--shimmer-base)_10%,var(--shimmer-highlight)_40%,var(--shimmer-base)_70%)] bg-clip-text text-transparent">
```

| 属性 | 值 |
|------|-----|
| animation | `shimmer 1.8s ease-out infinite` |
| background-size | `200% 100%` |
| 渐变 | `linear-gradient(90deg, shimmer-base 10%, shimmer-highlight 40%, shimmer-base 70%)` |
| 文字效果 | `bg-clip-text` + `text-transparent`（文字透明，显示背景渐变） |

### 备用 `.loading-text` class

```css
.loading-text {
  background: linear-gradient(-90deg, #a3a3a3 0%, #000000 5%, #a3a3a3 10%, #a3a3a3 100%);
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmerTransition 1.8s ease-out infinite;
}
```

注意：渐变方向为 `-90deg`，高亮点在 5% 处（更窄的光带）。

## 8. 圆角值

| Tailwind class | CSS 变量 | 值 |
|----------------|---------|-----|
| `rounded-02` | `--border-radius-02` | 0.125rem (2px) |
| `rounded-04` | `--border-radius-04` | 0.25rem (4px) |
| `rounded-08` | `--border-radius-08` | 0.5rem (8px) |
| `rounded-12` | `--border-radius-12` | 0.75rem (12px) |
| `rounded-16` | `--border-radius-16` | 1rem (16px) |

Timeline 使用的圆角：
- Surface：`rounded-t-12` / `rounded-b-12` (12px)
- Button：`rounded-08` (8px)
- StoppedHeader 外层：`rounded-12` (12px)

## 9. 间距汇总

### 固定间距（CSS 变量）

见布局分析文档中的 16 个 CSS 变量表。

### Tailwind 间距（组件内部）

| 位置 | class | 值 |
|------|-------|-----|
| TimelineStepContent 外层 | `px-1 pb-1` | 4px 水平, 4px 底部 |
| TimelineStepContent header | `pl-1` | 4px 左 |
| TimelineStepContent header 文字 | `pt-[step-top-padding] pl-[common-text-padding]` | 4px 顶, ~2px 左 |
| TimelineStepContent body | `pl-1 pb-1` | 4px 左, 4px 底 |
| TimelineStepContent body 右 | `pr-[step-header-right-section-width]` | 34px（与右区对齐） |
| CompletedHeader 文字区 | `gap-2` | 8px（文字与 MemoryTag 间距） |
| CollapsedStreamingContent | `px-2 pb-2` | 8px 水平, 8px 底部 |
| Error 图标 wrapper | `p-1.5` | 6px |

## 10. 过渡动画

| 元素 | 属性 | 值 |
|------|------|-----|
| TimelineSurface | color transition | `transition-colors duration-200` |
| Button tertiary | 背景/颜色 | 由 CSS class 定义 |
| Shimmer 文字 | background-position | `1.8s ease-out infinite` |

## 11. Tailwind class → CSS 变量映射表

供 pi-server 实现时参考，这些 class 在 Onyx 的 Tailwind config 中注册：

| Onyx Tailwind class | CSS 变量 | 类型 |
|--------------------|---------|------|
| `bg-border-01` | `var(--border-01)` | backgroundColor |
| `bg-border-04` | `var(--border-04)` | backgroundColor |
| `bg-background-tint-00` | `var(--background-tint-00)` | backgroundColor |
| `bg-background-tint-02` | `var(--background-tint-02)` | backgroundColor |
| `bg-status-error-00` | `var(--status-error-00)` | backgroundColor |
| `stroke-text-02` | `var(--text-02)` | stroke |
| `stroke-text-04` | `var(--text-04)` | stroke |
| `text-text-02` | `var(--text-02)` | color |
| `text-text-03` | `var(--text-03)` | color |
| `text-text-04` | `var(--text-04)` | color |
| `text-status-error-05` | `var(--status-error-05)` | color |
| `rounded-08` | `var(--border-radius-08)` = 0.5rem | borderRadius |
| `rounded-12` | `var(--border-radius-12)` = 0.75rem | borderRadius |
| `rounded-t-12` | 0.75rem top | borderRadius |
| `rounded-b-12` | 0.75rem bottom | borderRadius |

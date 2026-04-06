# Pi-Server Timeline 样式分析

> 来源：packages/ui/ + packages/frontend/
> 生成日期：2026-04-06

## 1. 颜色体系

### globals.css 中定义的 Timeline 颜色变量

#### Light Mode (`:root`)

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--tl-text-02` | `rgba(0, 0, 0, 0.45)` | icon stroke, muted labels |
| `--tl-text-04` | `rgba(0, 0, 0, 0.75)` | step header text |
| `--tl-border-01` | `#e6e6e6` | connector lines |
| `--tl-bg-tint-00` | `rgba(0, 0, 0, 0.02)` | surface background |
| `--shimmer-base` | `#a3a3a3` | shimmer 渐变基色 |
| `--shimmer-highlight` | `#000000` | shimmer 渐变高亮色 |

#### Dark Mode (`[data-theme="dark"]`)

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--tl-text-02` | `rgba(255, 255, 255, 0.45)` | 同上 |
| `--tl-text-04` | `rgba(255, 255, 255, 0.85)` | 同上 |
| `--tl-border-01` | `#333333` | 同上 |
| `--tl-bg-tint-00` | `rgba(255, 255, 255, 0.03)` | 同上 |
| `--shimmer-base` | `#5c5c5c` | 同上 |
| `--shimmer-highlight` | `#ffffff` | 同上 |

### 未定义但 Onyx 使用的颜色变量

| Onyx 变量 | 用途 | 缺失影响 |
|-----------|------|---------|
| `--text-03` | Header text, Button text (55%/60% opacity) | ❌ 未定义 |
| `--text-05` | Button active 态 (95% opacity) | ❌ 未定义 |
| `--border-04` | Connector hover 色 | ❌ 未定义 |
| `--background-tint-02` | Surface hover 背景, Button hover 背景 | ❌ 未定义 |
| `--status-error-00` | Error surface 背景 | ❌ 未定义（用 bg-red-500/[0.06] 代替） |
| `--status-error-05` | Error 图标颜色 | ❌ 未定义（用 --danger 代替） |

### 实际使用的颜色来源

| 位置 | 实际使用 | Onyx 对应 |
|------|---------|-----------|
| CompletedHeader 文字 | `text-muted` (#a3a3a3 light / #5c5c5c dark) | `text-text-03` (#0000008c / #ffffff99) |
| Step header 文字 | `text-muted` (#a3a3a3 light / #5c5c5c dark) | `text-text-04` (#000000bf / #ffffffd9) |
| Button 文字 | `text-muted/60` (60% of --text-muted) | `text-text-03` (#0000008c) |
| Button hover 文字 | `text-muted` | `text-text-04` (#000000bf) |
| StateIcon 默认 | `var(--tl-text-02)` ✅ | `stroke-text-02` ✅ |
| StateIcon error | `var(--danger, #ef4444)` | `var(--danger)` ≈ |
| Connector 线 | `var(--tl-border-01)` ✅ | `bg-border-01` ✅ |
| Surface tint | `var(--tl-bg-tint-00)` ✅ | `bg-background-tint-00` ≈ |
| Surface error | `bg-red-500/[0.06]` | `bg-status-error-00` (#fef7f6) |
| Avatar 颜色 | `var(--tl-text-04)` ✅ | 动态 agent avatar |

## 2. 字体体系

### Pi-Server 字体定义

| 变量 | 值 |
|------|-----|
| `--font-sans` | "Inter", -apple-system, BlinkMacSystemFont, "SF Pro SC", "PingFang SC", "Noto Sans SC", sans-serif |
| `--font-mono` | "JetBrains Mono", "SF Mono", "IBM Plex Mono", monospace |

### Timeline 中的实际字体使用

| 位置 | Tailwind class | 大小 | 字重 | 行高 |
|------|---------------|------|------|------|
| StreamingHeader 文字 | `text-sm` | 14px (0.875rem) | 400 (继承) | 1.25rem (20px) |
| CompletedHeader 文字 | `text-sm text-muted` | 14px | 400 (继承) | 1.25rem |
| Step header 文字 | `text-xs text-muted` | 12px (0.75rem) | 400 (继承) | 1rem (16px) |
| Button elapsed 文字 | `text-xs` | 12px | 400 (继承) | 1rem |
| DoneStep "Done" | `text-xs` | 12px | 400 (继承) | 1rem |
| ToolHeader label | inline `fontSize: 13` | 13px | `fontWeight: 500` | 继承 |

### 与 Onyx 的对比

| 位置 | Pi-Server | Onyx | 差异 |
|------|-----------|------|------|
| Header 文字 | text-sm (14px), weight 400 | mainUiAction: 14px, weight **600** | **字重不同** |
| Header 文字颜色 | text-muted (#a3a3a3) | text-03 (#0000008c = 55%) | **颜色不同** |
| Step header | text-xs (12px), weight 400 | mainUiMuted: **14px**, weight 400 | **字号不同** |
| Step header 颜色 | text-muted (#a3a3a3) | text-04 (#000000bf = 75%) | **颜色不同** |

## 3. Button 样式对比

### Pi-Server 按钮（手写 HTML）

```
<button className="flex items-center gap-1 text-xs text-muted/60 hover:text-muted px-1.5 py-0.5 rounded transition-colors cursor-pointer border-none bg-transparent">
```

| 属性 | 值 |
|------|-----|
| padding | `px-1.5 py-0.5` (6px 水平, 2px 垂直) |
| border-radius | `rounded` (4px) |
| font-size | `text-xs` (12px) |
| color | `text-muted/60` → 60% of --text-muted |
| hover color | `text-muted` → --text-muted |
| background | transparent |
| hover background | 无 |
| border | none |

### Onyx 按钮（Button 组件 tertiary md）

| 属性 | 值 |
|------|-----|
| padding | `p-1` (4px all sides) |
| border-radius | `rounded-08` (8px) |
| font-size | 继承 Text 组件 |
| color | `--text-03` (55% opacity) |
| hover color | `--text-04` (75% opacity) |
| background | transparent |
| hover background | `--background-tint-02` (#f0f0f1 / #26262b) |
| active background | `--background-tint-00` |

### 差异总结

| 属性 | Pi-Server | Onyx | 差异 |
|------|-----------|------|------|
| padding | 6px H, 2px V | 4px all | 不同 |
| border-radius | 4px | **8px** | **不同** |
| hover 背景 | 无 | **有 (tint-02)** | **缺失** |
| 文字颜色 | 60% of muted | text-03 (55%) | 近似但不同 |
| hover 文字 | muted | text-04 (75%) | 不同 |

## 4. 图标样式

### StateIcon（rail 中的图标）

| 属性 | Pi-Server | Onyx |
|------|-----------|------|
| 尺寸 | 硬编码 `size=12` | `var(--timeline-icon-size)` (12px) |
| 默认 stroke | `var(--tl-text-02)` | `stroke-text-02` |
| hover stroke | **无** | `stroke-text-04` |
| SVG 类型 | 3 种 inline SVG | `@opal/icons` 组件 |

### Fold/Expand 图标

| 属性 | Pi-Server | Onyx |
|------|-----------|------|
| 尺寸 | 16×16 (StreamingHeader/CompletedHeader), 14×14 (TimelineStepContent) | 由 Button 组件控制 |
| stroke-width | 2 | 由 SVG 组件定义 |
| 颜色 | 继承 button 文字色 | 继承 Button 组件色 |

### Error 图标

| 属性 | Pi-Server | Onyx |
|------|-----------|------|
| 位置 | 仅在 StateIcon (rail) | rail + step header 右侧 XOctagon |
| step header error 图标 | ❌ 无 | ✅ `SvgXOctagon` 16×16, `text-status-error-05` |

## 5. Connector 线样式

| 属性 | Pi-Server | Onyx |
|------|-----------|------|
| 宽度 | 1px (`w-px`) | 1px (`w-px`) |
| 默认颜色 | `var(--tl-border-01)` ✅ | `bg-border-01` ✅ |
| Hover 颜色 | **无变化** | `bg-border-04` |
| 首项 top | transparent ✅ | transparent ✅ |
| 末项 bottom | 不渲染 ✅ | 不渲染 ✅ |
| disableTopConnectorHover | ❌ 无此概念 | ✅ 支持 |

## 6. Surface 样式

| 属性 | Pi-Server | Onyx |
|------|-----------|------|
| tint 背景 | `var(--tl-bg-tint-00)` (inline style) | `bg-background-tint-00` (Tailwind) |
| hover 背景 | ❌ 无 | `bg-background-tint-02` |
| error 背景 | `bg-red-500/[0.06]` | `bg-status-error-00` (#fef7f6) |
| 圆角 | `rounded-t-xl` / `rounded-b-xl` (~12px) | `rounded-t-12` / `rounded-b-12` (12px) |
| 过渡 | `transition-colors duration-200` ✅ | `transition-colors duration-200` ✅ |
| isHover prop | ❌ 无 | ✅ 有 |

## 7. Shimmer 动画

| 属性 | Pi-Server | Onyx |
|------|-----------|------|
| 渐变方向 | `90deg` | `90deg` (但 .loading-text 用 `-90deg`) |
| 渐变断点 | `10%, 40%, 70%` | `10%, 40%, 70%` ✅ |
| 动画时长 | `2s` | `1.8s` |
| timing function | 未指定（默认 ease） | `ease-out` |
| 动画名 | `tl-shimmer` | `shimmer` |
| 方向 | `200% 0 → -200% 0` | `100% 0 → -100% 0` |
| 实现方式 | inline style + JS 注入 keyframes | Tailwind class (`animate-shimmer`) |
| fallback 颜色 | `#a1a1aa` / `#d4d4d8` | 无 fallback（使用 CSS 变量） |

### 差异

- **动画时长**：Pi 2s vs Onyx 1.8s
- **timing function**：Pi 无 vs Onyx ease-out
- **background-position 范围**：Pi `200% → -200%` vs Onyx `100% → -100%`（Pi 的动画移动距离是 Onyx 的 2 倍）
- **fallback 颜色**：Pi 的 fallback `#a1a1aa`/`#d4d4d8` 与 globals.css 中定义的 `#a3a3a3`/`#000000` 不匹配

## 8. 圆角值

| 位置 | Pi-Server | Onyx | 差异 |
|------|-----------|------|------|
| Surface top/bottom | `rounded-t-xl` / `rounded-b-xl` (12px) | `rounded-t-12` / `rounded-b-12` (12px) | ≈ 等价 |
| Button | `rounded` (4px) | `rounded-08` (8px) | **不同** |
| HeaderRow content | `rounded-t-xl` (12px) | 无圆角 | **不同** |

## 9. 间距对比

| 位置 | Pi-Server | Onyx | 差异 |
|------|-----------|------|------|
| StepContent 外层 | `px-1 pb-1` (4px) | `px-1 pb-1` (4px) | ✅ 相同 |
| StepContent header | `pl-1` (4px) | `pl-1` (4px) | ✅ 相同 |
| StepContent header 文字 | `pt-[step-top-padding]` | `pt-[step-top-padding] pl-[common-text-padding]` | **缺少 pl** |
| StepContent 右区 | 无固定宽度 | `w-[step-header-right-section-width]` (34px) | **缺失** |
| StepContent body 右 padding | 无 | `pr-[step-header-right-section-width]` (34px) | **缺失** |
| HeaderRow content | `p-1` (4px all) | 无 padding | **多余** |
| CompletedHeader gap | `gap-2` (8px) | `gap-2` (8px) | ✅ 相同 |
| DoneStep content left | `pl-2` (8px) | 由 StepContent 决定 | 不同 |

## 10. 过渡动画

| 位置 | Pi-Server | Onyx |
|------|-----------|------|
| TimelineSurface | `transition-colors duration-200` ✅ | `transition-colors duration-200` ✅ |
| TimelineHeaderRow content | `transition-colors duration-300` | 无过渡 |
| 展开动画 | `animate-in fade-in slide-in-from-top-2 duration-300` | 无（或由框架控制） |

## 11. Tailwind Config 扩展

文件：`packages/frontend/tailwind.config.ts`

已注册的自定义值：
- Colors：bg, panel, text-primary, text-secondary, text-muted, border, accent, danger, success, warning 等
- Border radius：`sm`→`--radius-sm`, `md`→`--radius-md`, `lg`→`--radius-lg`
- Shadows：xs, sm, md, focus-ring
- Fonts：sans→`--font-sans`, mono→`--font-mono`
- Transitions：fast (150ms), normal (200ms)

**未注册的 timeline 相关值：**
- 无 `tl-*` 颜色（如 `bg-tl-border-01`）
- 无 `rounded-12` / `rounded-08` 自定义圆角
- 无 `animate-shimmer` 自定义动画
- 无 `stroke-*` 自定义 stroke 颜色

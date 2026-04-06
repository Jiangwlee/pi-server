# Onyx 工具渲染研究

> 研究日期：2026-04-06
> 目标：了解 Onyx 的工具调用渲染架构和模式

## 架构概览

Onyx 采用 **Packet-based 渲染架构**，核心概念：

- **Packet**：SSE 流中的类型化事件（20+ 种 PacketType）
- **Renderer**：`MessageRenderer<T, S>` 组件，接收 packet 数组 + 状态
- **findRenderer()**：路由函数，根据 packet 类型选择 renderer
- **4 种 RenderType**：FULL / COMPACT / HIGHLIGHT / INLINE

```
SSE Stream → GroupedPackets → findRenderer() → MessageRenderer → RendererOutput → StepContainer
```

## RenderType 系统

```typescript
enum RenderType {
  FULL = "full"          // 展开的完整视图
  COMPACT = "compact"    // 折叠的截断视图
  HIGHLIGHT = "highlight" // 内联预览（无 StepContainer 包裹）
  INLINE = "inline"      // 阶段动态切换
}
```

| Mode | 用途 | UI 特征 |
|------|------|---------|
| **FULL** | 展开的 timeline step | 所有细节展示 |
| **COMPACT** | 折叠视图 | FadingEdgeContainer 截断，隐藏部分内容 |
| **HIGHLIGHT** | 并行流预览 | 无 StepContainer，`timelineLayout: "content"` |
| **INLINE** | 搜索工具折叠视图 | 阶段动态切换（Queries → Results） |

## 核心接口

### Renderer 组件接口

```typescript
type MessageRenderer<T extends Packet, S extends Partial<FullChatState>> =
  React.ComponentType<{
    packets: T[]
    state: S
    messageNodeId?: number
    hasTimelineThinking?: boolean
    onComplete: () => void
    renderType: RenderType
    animate: boolean
    stopPacketSeen: boolean
    stopReason?: StopReason
    isLastStep?: boolean
    isHover?: boolean
    children: (result: RendererOutput) => JSX.Element
  }>
```

### Renderer 输出接口

```typescript
interface RendererResult {
  icon: IconType | OnyxIconType | null
  status: string | JSX.Element | null
  content: JSX.Element
  expandedText?: JSX.Element
  supportsCollapsible?: boolean
  alwaysCollapsible?: boolean
  timelineLayout?: "timeline" | "content"
  noPaddingRight?: boolean
  surfaceBackground?: "tint" | "transparent" | "error"
}
```

## 所有 Renderer 列表

### 1. MessageTextRenderer（聊天消息）

- **Packets**: MESSAGE_START / MESSAGE_DELTA / MESSAGE_END
- **特点**: 渐进文本揭示（streaming 动画），Markdown + 引用，语音模式同步
- **配置**: PACKET_DELAY_MS = 10ms，最小思考时长 500ms

### 2. ReasoningRenderer（扩展思考）

- **Packets**: REASONING_START / REASONING_DELTA / SECTION_END / ERROR
- **特点**: 从第一个 markdown heading 提取标题（max 60 chars），可展开文本 + modal
- **Markdown**: 两套组件（mutedTextMarkdownComponents / collapsedMarkdownComponents）
- **配置**: 最小展示时长 500ms（动画时）
- **Surface**: `noPaddingRight: true`

### 3. WebSearchToolRenderer（Web 搜索）

- **Packets**: SEARCH_TOOL_START（is_internet_search === true）
- **4 种 RenderType 全支持**
- **特点**: SearchChipList 展示查询词，初始显示 3 个，每次展开 +5
- **Streaming**: BlinkingBar 动画
- **Icon**: SvgGlobe
- **Status**: "Searching the web"

### 4. InternalSearchToolRenderer（文档搜索）

- **Packets**: SEARCH_TOOL_START（is_internet_search !== true）
- **4 种 RenderType 全支持**
- **特点**: 阶段渲染（Queries → Results），结果带元数据（日期、标签、来源）
- **初始显示**: 3 个查询 / 3 个结果，每次 +5
- **Icon**: SvgSearchMenu
- **Status**: "Searching internal documents"

### 5. PythonToolRenderer（代码解释器）

- **Packets**: PYTHON_TOOL_START / PYTHON_TOOL_DELTA / TOOL_CALL_ARGUMENT_DELTA
- **状态机**: Writing → Executing → Complete/Failed
- **特点**: highlight.js 语法高亮，三段式（代码 / 输出 / 错误）
- **COMPACT**: FadingEdgeContainer max-height 24
- **Error**: 红色背景 `bg-status-error-01`
- **配置**: alwaysCollapsible = true
- **Icon**: SvgTerminal

### 6. CustomToolRenderer（自定义 API 工具）

- **Packets**: CUSTOM_TOOL_START / CUSTOM_TOOL_ARGS / CUSTOM_TOOL_DELTA / SECTION_END / ERROR
- **特点**: 双阶段（Request args → Response JSON/files），auth error 检测
- **响应类型**: "image" / "csv" / JSON
- **COMPACT**: FadingEdgeContainer max-height 24
- **Icon**: SvgActions

### 7. ImageToolRenderer（图片生成）

- **Packets**: IMAGE_GENERATION_TOOL_START / IMAGE_GENERATION_TOOL_DELTA / SECTION_END / ERROR
- **特点**: 网格布局（移动端 1 列，桌面 2 列），GeneratingImageDisplay 加载态
- **Status**: "Generated N image(s)"

### 8. FileReaderToolRenderer（文件读取）

- **Packets**: FILE_READER_START / FILE_READER_RESULT / SECTION_END / ERROR
- **特点**: 文件名 + 字符范围（chars 123-456 of 7890），预览卡片
- **COMPACT**: 无预览
- **Icon**: SvgFileText

### 9. FetchToolRenderer（URL 读取）

- **Packets**: FETCH_TOOL_START / FETCH_TOOL_URLS / FETCH_TOOL_DOCUMENTS / SECTION_END
- **3 种 RenderType**: FULL / COMPACT / HIGHLIGHT
- **特点**: 双阶段（URLs → Documents），SearchChipList 展示
- **Icon**: SvgCircle

### 10. MemoryToolRenderer（记忆工具）

- **Packets**: MEMORY_TOOL_START / MEMORY_TOOL_DELTA / MEMORY_TOOL_NO_ACCESS / SECTION_END
- **特点**: 集成 MemoriesModal，expand 按钮打开完整视图
- **操作**: "add" / "update"
- **2 种 RenderType**: FULL / HIGHLIGHT
- **Icon**: SvgEditBig

### 11. DeepResearchPlanRenderer（深度研究计划）

- **Packets**: DEEP_RESEARCH_PLAN_START / DEEP_RESEARCH_PLAN_DELTA / SECTION_END
- **特点**: 可展开 Markdown 内容
- **Icon**: SvgCircle

### 12. ResearchAgentRenderer（研究代理步骤）

- **Packets**: RESEARCH_AGENT_START / INTERMEDIATE_REPORT_START / _DELTA / _CITED_DOCS
- **特点**: 按 sub_turn_index 分组嵌套工具，递归 TimelineRendererComponent
- **3 种 RenderType**: FULL（所有工具）/ COMPACT（仅最新）/ HIGHLIGHT（最新内联）

## 关键 UI 组件

### StepContainer（Timeline 步骤包裹器）

```
web/src/app/app/message/messageComponents/timeline/StepContainer.tsx
```

- Icon + header + content 布局
- 可控展开/折叠
- Rail 连接线
- Surface 背景: "tint"（默认蓝色调）/ "transparent" / "error"（红色）
- 最后一步检测（底部圆角）

### TimelineSurface

- 背景变体: tint / transparent / error
- Hover 态 tint 加深
- 圆角: top/bottom 12px

### SearchChipList（搜索结果展示）

```
timeline/renderers/search/SearchChipList.tsx
```

- 分页 chip 展示 + "Show More" 按钮
- 交错动画（30ms 间隔）
- 可配置初始/展开数量
- 两种模式: queries vs documents
- 元数据: 日期、标签、来源图标

### FadingEdgeContainer（渐隐截断）

- COMPACT 模式核心组件
- 固定 max-height（通常 24）
- 底部渐隐遮罩效果
- 用于 PythonToolRenderer、CustomToolRenderer

### CodeBlock（代码块）

```
web/src/app/app/message/CodeBlock.tsx
```

- highlight.js 语法高亮
- 复制按钮 + "Copied!" 反馈
- 语言检测
- 内联 vs 块级模式
- 水平滚动

### BlinkingBar（加载指示器）

- 3 个动画圆点
- 用于所有 streaming 态的工具

## Renderer 路由

```typescript
function findRenderer(groupedPackets: GroupedPackets): MessageRenderer | null {
  // 按优先级匹配
  if (isChatPacket)           → MessageTextRenderer
  if (isDeepResearchPlan)     → DeepResearchPlanRenderer
  if (isResearchAgent)        → ResearchAgentRenderer
  if (isWebSearch)            → WebSearchToolRenderer
  if (isInternalSearch)       → InternalSearchToolRenderer
  if (isPython)               → PythonToolRenderer
  if (isCustomTool)           → CustomToolRenderer
  if (isImageGeneration)      → ImageToolRenderer
  if (isFileReader)           → FileReaderToolRenderer
  if (isFetch)                → FetchToolRenderer
  if (isMemory)               → MemoryToolRenderer
  if (isReasoning)            → ReasoningRenderer
  return null
}
```

## 对比 pi-server 的启示

| 维度 | Onyx | pi-server 现状 | 可借鉴 |
|------|------|---------------|--------|
| **渲染基础** | Packet type 路由 | Message type + tool name 路由 | 保持 pi-server 方案 |
| **RenderType** | 4 种（FULL/COMPACT/HIGHLIGHT/INLINE） | 4 种（已定义，实现 full+compact） | 已对齐 |
| **搜索结果** | SearchChipList 分页 + 动画 | 无 | 搜索工具 renderer |
| **代码块** | highlight.js + 复制 | 已有基础 | 可增强 |
| **截断** | FadingEdgeContainer 渐隐 | 无 | compact 模式可用 |
| **错误样式** | surfaceBackground: "error" | CSS variable | 已基本对齐 |
| **嵌套 timeline** | ResearchAgentRenderer 递归 | 无 | 未来 agent 工具 |
| **Streaming 指示** | BlinkingBar 3 点 | shimmer 动画 | 风格不同但功能等价 |

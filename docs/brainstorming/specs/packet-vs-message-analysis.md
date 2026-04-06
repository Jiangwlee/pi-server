# Onyx Packet vs Pi-Server 消息体系对比

> 调查日期：2026-04-06

## 1. Onyx Packet 类型系统

### 1.1 Packet 类型枚举（完整列表）

**定义位置（后端）**: `~/Github/onyx/backend/onyx/server/query_and_chat/streaming_models.py` (L14-56)
**定义位置（前端）**: `~/Github/onyx/web/src/app/app/services/streamingModels.ts` (L8-64)

后端使用 `StreamingType` enum，前端使用 `PacketType` enum，值完全一一对应。

#### 控制类（4 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `SECTION_END` | `section_end` | 标记一个 turn/tab 分组结束 |
| `STOP` | `stop` | 标记整个流结束，携带 `stop_reason` |
| `TOP_LEVEL_BRANCHING` | `top_level_branching` | 通知前端即将有 N 个并行分支 |
| `ERROR` | `error` | 错误 packet，携带异常信息 |

#### LLM 响应类（3 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `MESSAGE_START` | `message_start` | 最终回答开始，携带 `final_documents`、`pre_answer_processing_seconds` |
| `MESSAGE_DELTA` | `message_delta` | 回答文本增量 |
| `MESSAGE_END` | `message_end` | 回答结束（注：前端 enum 有定义但后端 streaming_models.py 中未定义对应 class） |

#### 搜索工具类（3 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `SEARCH_TOOL_START` | `search_tool_start` | 搜索开始，`is_internet_search` 区分内部/网络搜索 |
| `SEARCH_TOOL_QUERIES_DELTA` | `search_tool_queries_delta` | 搜索查询词增量 |
| `SEARCH_TOOL_DOCUMENTS_DELTA` | `search_tool_documents_delta` | 搜索结果文档增量 |

#### 图片生成类（3 种，后端含 heartbeat 共 3+1）

| PacketType | 值 | 用途 |
|---|---|---|
| `IMAGE_GENERATION_TOOL_START` | `image_generation_start` | 图片生成开始 |
| `IMAGE_GENERATION_TOOL_DELTA` | `image_generation_final` | 生成完成，携带 `images[]` |
| （仅后端） `IMAGE_GENERATION_HEARTBEAT` | `image_generation_heartbeat` | 心跳保活 |

#### Python 代码执行类（2 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `PYTHON_TOOL_START` | `python_tool_start` | 代码执行开始，携带 `code` |
| `PYTHON_TOOL_DELTA` | `python_tool_delta` | 执行结果增量，携带 `stdout`/`stderr`/`file_ids` |

#### URL 抓取类（3 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `FETCH_TOOL_START` | `open_url_start` | URL 抓取开始 |
| `FETCH_TOOL_URLS` | `open_url_urls` | 待抓取的 URL 列表 |
| `FETCH_TOOL_DOCUMENTS` | `open_url_documents` | 抓取结果文档 |

#### 自定义工具类（3 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `CUSTOM_TOOL_START` | `custom_tool_start` | 自定义工具开始，携带 `tool_name`/`tool_id` |
| `CUSTOM_TOOL_ARGS` | `custom_tool_args` | 工具参数 |
| `CUSTOM_TOOL_DELTA` | `custom_tool_delta` | 工具结果增量 |

#### 文件读取类（2 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `FILE_READER_START` | `file_reader_start` | 文件读取开始 |
| `FILE_READER_RESULT` | `file_reader_result` | 读取结果，携带文件名/预览等 |

#### 记忆工具类（3 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `MEMORY_TOOL_START` | `memory_tool_start` | 记忆操作开始 |
| `MEMORY_TOOL_DELTA` | `memory_tool_delta` | 记忆内容，携带 `operation`(add/update) |
| `MEMORY_TOOL_NO_ACCESS` | `memory_tool_no_access` | 无权限访问记忆 |

#### 推理/思考类（3 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `REASONING_START` | `reasoning_start` | 推理开始 |
| `REASONING_DELTA` | `reasoning_delta` | 推理文本增量 |
| `REASONING_DONE` | `reasoning_done` | 推理结束 |

#### 引用类（2 种，后端含 debug 共 3）

| PacketType | 值 | 用途 |
|---|---|---|
| `CITATION_START` | `citation_start` | 引用区段开始 |
| `CITATION_INFO` | `citation_info` | 单条引用信息 |
| （仅后端） `TOOL_CALL_DEBUG` | `tool_call_debug` | 调试用 tool call 信息 |

#### 工具调用参数流式类（1 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `TOOL_CALL_ARGUMENT_DELTA` | `tool_call_argument_delta` | 工具调用参数增量流 |

#### 深度研究类（6 种）

| PacketType | 值 | 用途 |
|---|---|---|
| `DEEP_RESEARCH_PLAN_START` | `deep_research_plan_start` | 研究计划开始 |
| `DEEP_RESEARCH_PLAN_DELTA` | `deep_research_plan_delta` | 计划内容增量 |
| `RESEARCH_AGENT_START` | `research_agent_start` | 研究 agent 开始，携带 `research_task` |
| `INTERMEDIATE_REPORT_START` | `intermediate_report_start` | 中间报告开始 |
| `INTERMEDIATE_REPORT_DELTA` | `intermediate_report_delta` | 中间报告增量 |
| `INTERMEDIATE_REPORT_CITED_DOCS` | `intermediate_report_cited_docs` | 中间报告引用文档 |

**总计：前端 38 种 PacketType，后端 StreamingType 39 种**（后端多 `IMAGE_GENERATION_HEARTBEAT` 和 `TOOL_CALL_DEBUG`）。

### 1.2 Packet 数据结构

**定义位置**: `~/Github/onyx/backend/onyx/server/query_and_chat/streaming_models.py` (L421-424)，前端镜像在 `~/Github/onyx/web/src/app/app/services/streamingModels.ts` (L402-413)。

```typescript
// 前端
interface Placement {
  turn_index: number;
  tab_index?: number;      // 同 turn_index 内的并行工具调用
  sub_turn_index?: number;
  model_index?: number;    // 多模型并行生成
}

interface Packet {
  placement: Placement;
  obj: ObjTypes;           // 联合类型，由 type 字段鉴别
}
```

```python
# 后端
class Packet(BaseModel):
    placement: Placement
    obj: Annotated[PacketObj, Field(discriminator="type")]
```

关键设计点：
- **Placement 是路由坐标**：`turn_index` 标识第几轮工具调用，`tab_index` 标识同轮内的并行分支。前端用 `(turn_index, tab_index)` 组合作为 group key 将 packet 分组。
- **obj 是 discriminated union**：后端用 Pydantic discriminator，前端靠 `type` 字段手动判断。

### 1.3 渲染分发机制

**核心文件**: `~/Github/onyx/web/src/app/app/message/messageComponents/renderMessageComponent.tsx` (L114-162)

Onyx 使用**函数式路由** (`findRenderer`)，逐一检查 packet group 中的 packet 类型来匹配 renderer：

```typescript
export function findRenderer(groupedPackets): MessageRenderer | null {
  if (packets.some(isChatPacket))              → MessageTextRenderer
  if (packets.some(isDeepResearchPlanPacket))   → DeepResearchPlanRenderer
  if (packets.some(isResearchAgentPacket))      → ResearchAgentRenderer
  if (packets.some(isWebSearchPacket))          → WebSearchToolRenderer
  if (packets.some(isInternalSearchPacket))     → InternalSearchToolRenderer
  if (packets.some(isImageToolPacket))          → ImageToolRenderer
  if (packets.some(isPythonToolPacket))         → PythonToolRenderer
  if (packets.some(isFileReaderToolPacket))     → FileReaderToolRenderer
  if (packets.some(isCustomToolPacket))         → CustomToolRenderer
  if (packets.some(isFetchToolPacket))          → FetchToolRenderer
  if (packets.some(isMemoryToolPacket))         → MemoryToolRenderer
  if (packets.some(isReasoningPacket))          → ReasoningRenderer
  return null
}
```

**特点**：
- 优先级排序：Deep Research 在 Search 之前检查，因为深度研究的 group 可能混合多种 packet。
- 每个 renderer 是一个 React 组件（`MessageRenderer<T, S>`），接收 `packets: T[]`，使用 render-props 模式 (`children: (result) => JSX`)。
- 有混合内容特殊处理：当 group 同时包含 chat + image 时走 `MixedContentHandler`。

**Packet 预处理**：`~/Github/onyx/web/src/app/app/message/messageComponents/timeline/hooks/packetProcessor.ts`
- `processPackets()` 将 raw packets 按 `(turn_index, tab_index)` 分组
- 自动注入 `SECTION_END` 当检测到新 turn_index
- 分类为 `toolGroupKeys` 和 `displayGroupKeys`

### 1.4 双源流架构

Onyx 的 packet 有**两个来源**：

**来源 1：LLM 层**（chat loop 发出的 packet）
- `MESSAGE_START` / `MESSAGE_DELTA` — LLM 文本响应
- `REASONING_START` / `REASONING_DELTA` / `REASONING_DONE` — LLM 思考
- `TOOL_CALL_ARGUMENT_DELTA` — LLM 流式输出工具调用参数
- `CITATION_INFO` — 引用信息
- 控制 packet (`STOP`, `SECTION_END`, `TOP_LEVEL_BRANCHING`, `ERROR`)

**来源 2：工具执行层**（工具通过 `Emitter` 主动发出 packet）

每个工具都有 `emit_start()` 方法和执行中的 `emitter.emit()` 调用。`Emitter` 类定义于 `~/Github/onyx/backend/onyx/chat/emitter.py`，它将 packet 放入共享 `merged_queue`。

工具 emit 示例：
- **SearchTool**: `emit_start` → `SearchToolStart` → 执行中 emit `SearchToolQueriesDelta` → `SearchToolDocumentsDelta`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/search/search_tool.py` (L532-533, L720, L873)
- **PythonTool**: `emit_start` 延迟到 `run()` → `PythonToolStart(code=...)` → 执行中 emit `PythonToolDelta(stdout/stderr)`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/python/python_tool.py` (L143-147, L179, L229, L323, L356)
- **OpenUrlTool**: `emit_start` → `OpenUrlStart` → `OpenUrlUrls` → `OpenUrlDocuments`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/open_url/open_url_tool.py` (L456-458, L500, L624)
- **CustomTool**: `emit_start` → `CustomToolStart` → `CustomToolArgs` → `CustomToolDelta`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/custom/custom_tool.py` (L140-141, L179, L247)
- **MemoryTool**: `emit_start` → `MemoryToolStart` → `MemoryToolDelta`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/memory/memory_tool.py` (L105-106, L145)
- **ImageGenerationTool**: `emit_start` → `ImageGenerationToolStart`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/images/image_generation_tool.py` (L158-159)
- **MCP Tool**: `emit_start` → `CustomToolStart` → `CustomToolArgs` → `CustomToolDelta`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/mcp/mcp_tool.py` (L104-105, L185, L250, L305)
- **WebSearchTool**: `emit_start` → `SearchToolStart(is_internet_search=True)` → `SearchToolQueriesDelta` → `SearchToolDocumentsDelta`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/web_search/web_search_tool.py` (L167-168, L227, L322)
- **FileReaderTool**: `emit_start` → `FileReaderStart` → `FileReaderResult`
  - 文件：`~/Github/onyx/backend/onyx/tools/tool_implementations/file_reader/file_reader_tool.py` (L116-117, L218)

两个来源的 packet 都通过 `Emitter` → `merged_queue` 统一汇入 `_run_models` drain loop，再 SSE 发送到前端。前端统一用 `Placement` 路由和 `PacketType` 判断类型，不区分来源。

## 2. Pi-Server 消息类型系统

### 2.1 消息类型定义

**核心类型文件**: `/home/bruce/Projects/pi-server/packages/ui/src/client/types.ts`

#### ContentBlock（4 种）

```typescript
type TextContent    = { type: 'text'; text: string }
type ThinkingContent = { type: 'thinking'; thinking: string; thinkingSignature?: string; redacted?: boolean }
type ToolCall       = { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> }
type ImageContent   = { type: 'image'; data: string; mimeType: string }

type ContentBlock = TextContent | ThinkingContent | ToolCall | ImageContent
```

#### ChatMessage

```typescript
type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: ContentBlock[]
  streaming?: boolean
  usage?: Usage
  stopReason?: StopReason     // 'stop' | 'length' | 'toolUse' | 'error' | 'aborted'
  model?: string
  toolCallId?: string         // 仅 role='tool' 时使用
  toolName?: string
  isError?: boolean
  timestamp?: number
  attachments?: ChatAttachment[]
}
```

#### AssistantMessageEvent（流式增量事件，12 种）

```typescript
type AssistantMessageEvent =
  | { type: 'start' }
  | { type: 'text_start'; contentIndex: number }
  | { type: 'text_delta'; contentIndex: number; delta: string }
  | { type: 'text_end'; contentIndex: number; content: string }
  | { type: 'thinking_start'; contentIndex: number }
  | { type: 'thinking_delta'; contentIndex: number; delta: string }
  | { type: 'thinking_end'; contentIndex: number; content: string }
  | { type: 'toolcall_start'; contentIndex: number }
  | { type: 'toolcall_delta'; contentIndex: number; delta: string }
  | { type: 'toolcall_end'; contentIndex: number; toolCall: ToolCall }
  | { type: 'done'; reason: 'stop' | 'length' | 'toolUse' }
  | { type: 'error'; reason: 'aborted' | 'error'; error: unknown }
```

#### AgentEvent（agent 生命周期事件，10 种）

```typescript
type AgentEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end'; messages: unknown[] }
  | { type: 'turn_start' }
  | { type: 'turn_end'; message: unknown; toolResults: ToolResultMessage[] }
  | { type: 'message_start'; message: unknown }
  | { type: 'message_update'; message: unknown; assistantMessageEvent: AssistantMessageEvent }
  | { type: 'message_end'; message: unknown }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_execution_update'; toolCallId: string; toolName: string; partialResult: unknown }
  | { type: 'tool_execution_end'; toolCallId: string; toolName: string; result: unknown; isError: boolean }
```

#### ToolExecution（UI 追踪）

```typescript
type ToolExecution = {
  toolCallId: string
  toolName: string
  state: 'inprogress' | 'complete' | 'error'
  startTime: number
  partialResult?: ChatMessage
}
```

### 2.2 Tool Render Registry

**Pi-server (React)**: `/home/bruce/Projects/pi-server/packages/ui/src/tools/`

```
tools/
├── types.ts        -- ToolRenderer interface, ToolRenderContext, ToolRenderResult
├── registry.ts     -- Map<string, ToolRenderer>，按 toolName 查找
├── index.ts        -- renderTool() 入口 + resolveToolState()
└── renderers/
    ├── DefaultRenderer.ts
    └── ToolHeader.ts
```

核心接口（`types.ts`）：

```typescript
interface ToolRenderer {
  render(ctx: ToolRenderContext): ToolRenderResult
}

type ToolRenderContext = {
  toolCall: ToolCall          // 工具名 + 参数
  result?: ChatMessage        // 工具结果（role='tool'）
  state: ToolRenderState      // 'inprogress' | 'complete' | 'error'
}

type ToolRenderResult = {
  content: ReactNode
  custom?: boolean            // true = 自定义布局；false = 包裹在默认卡片中
}
```

注册机制（`registry.ts`）：
```typescript
const renderers = new Map<string, ToolRenderer>()
export function registerToolRenderer(toolName: string, renderer: ToolRenderer): void
export function getToolRenderer(toolName: string): ToolRenderer | undefined
```

渲染入口（`index.ts`）：
```typescript
export function renderTool(toolCall, result, streaming): ToolRenderResult {
  const state = resolveToolState(result, streaming)
  const renderer = getToolRenderer(toolCall.name) ?? defaultRenderer
  return renderer.render({ toolCall, result, state })
}
```

**Pi-mono (Lit)**: `~/Github/pi-mono/packages/web-ui/src/tools/`

```
tools/
├── types.ts              -- ToolRenderer<TParams, TDetails> interface
├── renderer-registry.ts  -- Map<string, ToolRenderer>，renderHeader(), renderCollapsibleHeader()
├── index.ts              -- renderTool() + showJsonMode 开关
├── renderers/
│   ├── BashRenderer.ts
│   ├── DefaultRenderer.ts
│   ├── CalculateRenderer.ts
│   └── GetCurrentTimeRenderer.ts
├── artifacts/
│   ├── artifacts-tool-renderer.ts
│   └── index.ts
├── javascript-repl.ts
└── extract-document.ts
```

核心接口（`types.ts`）：
```typescript
interface ToolRenderer<TParams = any, TDetails = any> {
  render(
    params: TParams | undefined,
    result: ToolResultMessage<TDetails> | undefined,
    isStreaming?: boolean,
  ): ToolRenderResult
}

interface ToolRenderResult {
  content: TemplateResult    // Lit HTML template
  isCustom: boolean
}
```

pi-mono 与 pi-server 的 registry 模式完全相同（都是 `Map<toolName, ToolRenderer>`），但 pi-mono 用 Lit/TemplateResult，pi-server 用 React/ReactNode。

### 2.3 SSE 事件流

**定义位置**: `/home/bruce/Projects/pi-server/packages/server/src/runtime/session-registry.ts` (L4-8)

Pi-server 只有 **3 种 SSE event 类型**：

| event | 用途 | data 内容 |
|---|---|---|
| `pi` | 转发 SDK 的 AgentEvent | 原始 AgentEvent JSON |
| `status` | 会话状态变更 | `{ status: 'idle' \| 'running' \| 'error' }` |
| `error` | 错误通知 | `{ code: string, message: string }` |

```typescript
type SSEEnvelope = {
  event: 'pi' | 'status' | 'error'
  data: string
  id: number
}
```

**流传递路径**：
1. SDK session subscribe callback 收到 `AgentEvent`
2. `SessionRegistry.broadcast(entry, 'pi', event)` 将 event 包装为 `SSEEnvelope`
3. SSE client 收到后，`use-chat` hook 的 `onEvent` handler 解析 `AgentEvent`
4. 根据 `event.type` 更新 React state：`messages[]`、`toolExecutions Map`、`status`

**工具结果传递**：
- SDK 在 `turn_end` 事件中携带 `toolResults: ToolResultMessage[]`
- `use-chat` hook 在收到 `turn_end` 时将 `toolResults` 转换为 `ChatMessage[]`（role='tool'）并 append 到 messages
- 工具执行过程中通过 `tool_execution_update` 提供 `partialResult`

## 3. 对比分析

### 3.1 映射表（Onyx Packet ↔ Pi-Server Message）

| Onyx PacketType | Pi-Server 等价机制 | 差异说明 |
|---|---|---|
| `MESSAGE_START` | `AssistantMessageEvent.start` + `text_start` | Onyx 合一，Pi 拆为 message 级和 content 级 |
| `MESSAGE_DELTA` | `AssistantMessageEvent.text_delta` | 基本等价 |
| `MESSAGE_END` | `AssistantMessageEvent.done` + `message_end` AgentEvent | Pi 有两层结束 |
| `STOP` | `AgentEvent.agent_end` | Pi 无显式 stop packet，agent_end 即结束 |
| `SECTION_END` | 无直接等价 | Pi 不需要，工具结束由 `tool_execution_end` 标记 |
| `TOP_LEVEL_BRANCHING` | 无 | Pi 不支持并行分支提前通知 |
| `ERROR` | `SSEEnvelope.event='error'` 或 `AssistantMessageEvent.error` | Pi 有多层错误通知 |
| `SEARCH_TOOL_START` | `AgentEvent.tool_execution_start` (toolName='search') | Pi 不区分工具类型的 start |
| `SEARCH_TOOL_QUERIES_DELTA` | `AgentEvent.tool_execution_update` (partialResult) | Pi 通过通用 partial result |
| `SEARCH_TOOL_DOCUMENTS_DELTA` | `AgentEvent.tool_execution_end` (result) | Pi 在 turn_end.toolResults 中 |
| `PYTHON_TOOL_START` | `AgentEvent.tool_execution_start` (toolName='python') | 同上 |
| `PYTHON_TOOL_DELTA` | `AgentEvent.tool_execution_update` (partialResult) | Pi stdout/stderr 在 details 中 |
| `CUSTOM_TOOL_*` | `tool_execution_start/update/end` | Pi 通用机制 |
| `FILE_READER_*` | `tool_execution_start/end` | Pi 通用机制 |
| `MEMORY_TOOL_*` | `tool_execution_start/update/end` | Pi 通用机制 |
| `FETCH_TOOL_*` | `tool_execution_start/update/end` | Pi 通用机制 |
| `IMAGE_GENERATION_*` | `tool_execution_start/end` | Pi 通用机制 |
| `REASONING_START/DELTA/DONE` | `AssistantMessageEvent.thinking_start/delta/end` | Pi 将 reasoning 作为 content block |
| `CITATION_*` | 无等价 | Pi 无引用系统 |
| `TOOL_CALL_ARGUMENT_DELTA` | `AssistantMessageEvent.toolcall_delta` | Pi 有流式 tool call 参数 |
| `DEEP_RESEARCH_*` | 无 | Pi 不支持深度研究 |
| `RESEARCH_AGENT_*` | 无 | Pi 不支持研究 agent |

### 3.2 关键架构差异

| 维度 | Onyx | Pi-Server |
|---|---|---|
| **流模型** | 双源流：LLM + 工具执行都直接 emit packet | 单源流：SDK event → SSE 转发，工具通过 AgentEvent 回报 |
| **类型精细度** | 38+ 种 packet type，每种工具有专属 start/delta/end | 10 种 AgentEvent + 12 种 AssistantMessageEvent，工具用通用的 3 阶段生命周期 |
| **路由机制** | `Placement(turn_index, tab_index)` 坐标寻址 | 无 placement，靠 `toolCallId` 关联 assistant → tool result |
| **渲染分发** | `findRenderer()` 扫描 packet 类型，静态 if-else 链 | `getToolRenderer(toolName)` 按工具名查 Map |
| **Renderer 接口** | `MessageRenderer<PacketType, ChatState>` 接收 packets 数组 | `ToolRenderer.render(ctx)` 接收 toolCall + result |
| **工具结果** | packet 流内嵌，工具可持续 emit delta | 结构化 `ToolResultMessage`，支持 partialResult update |
| **并行支持** | `tab_index` 标识同 turn 并行分支，`TOP_LEVEL_BRANCHING` 预告 | SDK 支持 `parallel` toolExecution mode，但无前端坐标系统 |
| **消息模型** | 扁平 packet 流，按 placement 分组 | 结构化 `ChatMessage[]`，按 role 区分 user/assistant/tool |

### 3.3 精细化程度差异

**Onyx 更精细的地方**：
- 每种工具有专属 packet 类型和专属 payload（如 `PythonToolStart.code`、`SearchToolQueriesDelta.queries`）
- 有明确的 `SECTION_END` 标记工具执行边界
- `Placement` 坐标系可精确定位每个 packet 在 timeline 中的位置
- 深度研究有独立的 6 种 packet 类型
- 引用系统有独立的 `CITATION_INFO` packet

**Pi-Server 更精细的地方**：
- `AssistantMessageEvent` 区分 `contentIndex`，可精确定位 content block 内的增量
- `ToolExecution` 追踪有独立的 `partialResult` 概念，允许工具在执行中推送结构化中间结果
- `AgentEvent` 有清晰的 `turn` 生命周期（`turn_start` → `turn_end`），而 Onyx 的 turn 边界靠 `SECTION_END` 隐式判断

## 4. 对 CollapsedStreamingContent 的影响

### 4.1 Onyx 依赖 Packet 类型判断显示条件

`CollapsedStreamingContent`（`~/Github/onyx/web/src/app/app/message/messageComponents/timeline/CollapsedStreamingContent.tsx`）本身是一个轻量包装组件，将 `TransformedStep` 传递给 `TimelineRendererComponent` 渲染。

关键依赖链：
1. `packetProcessor.ts` 的 `isToolPacket()` / `isDisplayPacket()` 判断哪些 packet 归入 tool group vs display group
2. `findRenderer()` 根据第一个特征 packet 选择 renderer
3. 每个 renderer 自行决定展开/折叠行为（通过 `RendererResult.supportsCollapsible` 和 `alwaysCollapsible`）

Onyx 判断"是否折叠工具步骤"的逻辑基于：
- `isToolPacket()` 检查（`packetUtils.ts` L9-44）：明确列出所有工具相关的 PacketType
- `finalAnswerComing` 状态：当收到 `MESSAGE_START` 或 `IMAGE_GENERATION_TOOL_START` 时为 true
- `stopPacketSeen`：当收到 `STOP` packet 时为 true

### 4.2 Pi-Server 可用的等价判断方式

Pi-Server 没有 packet 类型系统，但可以用以下等价方式判断：

| Onyx 判断 | Pi-Server 等价方式 |
|---|---|
| `isToolPacket(packet)` | `msg.role === 'assistant' && msg.content.some(c => c.type === 'toolCall')` |
| `isDisplayPacket(packet)` (MESSAGE_START) | `msg.role === 'assistant' && msg.content.some(c => c.type === 'text')` |
| `finalAnswerComing` | `groupedTurn.finalAnswer !== undefined` |
| `stopPacketSeen` | `status === 'idle'` （agent 已结束） |
| `isReasoningPacket` | `msg.content.some(c => c.type === 'thinking')` |
| `SECTION_END` for a tool | `toolExecution.state === 'complete' \|\| toolExecution.state === 'error'` |
| tool type-specific check (e.g., `isPythonToolPacket`) | `toolCall.name === 'python'` 或 `toolCall.name === 'bash'` |
| `groupPacketsByTurnIndex` | `groupMessagesIntoTurns(messages)` — 按 user/assistant/tool 分组为 `GroupedTurn[]` |

关键差异：Pi-server 的折叠判断需要基于 `ChatMessage` 语义而非 packet 类型。`groupMessages.ts` 中的 `AgentTurn` 结构（`steps: ToolStep[]` + `finalAnswer?: ChatMessage`）已经提供了 Onyx `toolGroups` + `potentialDisplayGroups` 的等价语义。

## 5. Pi-Server 前端适配层架构

> **注意：五层模型已在 2026-04-06 前端架构重构中合并为三层架构（Transport | State | Render）。详见 [docs/architect/frontend-architect.md](../../architect/frontend-architect.md)。**

### 5.1 五层适配模型（已废弃）

```
SSE Event → L1 解析分发 → L2 状态聚合 → L3 Turn 分组 → L4 状态解析 → L5 渲染分发 → UI
```

| 层 | 文件 | 输入 → 输出 | 核心转换 | 显式/隐式 |
|----|------|-------------|---------|-----------|
| **L1** SSE 解析 | `sse-client.ts` → `use-chat.ts` | SSEFrame → AgentEvent | 解析 SSE 帧，switch 分发事件类型 | 隐式（类型断言） |
| **L2** 状态聚合 | `use-chat.ts` | AgentEvent → `messages[]` + `toolExecutions Map` | 离散事件聚合为统一状态（start/update/end → ToolExecution） | 显式 |
| **L3** Turn 分组 | `groupMessages.ts` | `ChatMessage[]` → `GroupedTurn[]` | 扁平消息 → Turn 结构（含 `ToolStep[]` + `finalAnswer`） | 显式 |
| **L4** 状态解析 | `resolveToolState()` | ToolExecution ∪ result → ToolRenderState | 双源优先级：ToolExecution 优先，fallback 到 result 推断 | 显式 |
| **L5** 渲染分发 | `registry.ts` → `ToolCallBlock` | toolName → ToolRenderer → ReactNode | Map 查找 + DefaultRenderer 兜底 | 显式 |

### 5.2 关键适配函数

| 函数 | 位置 | 职责 |
|------|------|------|
| `consumeSSEBuffer()` | `sse-client.ts` | SSE 文本协议 → ParsedSSEFrame[] |
| `onEvent()` switch | `use-chat.ts:279-467` | AgentEvent 分发 → state 更新 |
| `toPartialChatMessage()` | `use-chat.ts:139-151` | tool_execution_update 的 partialResult → ChatMessage |
| `groupMessagesIntoTurns()` | `groupMessages.ts:21-59` | 扁平 messages → GroupedTurn[] |
| `resolveToolState()` | `tools/index.ts:12-33` | ToolExecution ∪ result → 'inprogress' \| 'complete' \| 'error' |
| `renderTool()` | `tools/index.ts:21-33` | toolName → renderer.render(ctx) → ToolRenderResult |

### 5.3 架构启示

**适配层已存在但未显式命名。** Turn 聚合（L3）、ToolExecution 状态追踪（L2）、状态解析（L4）都是适配层的功能实现。缺少的不是适配能力，而是：

1. **命名和边界** — 各层散落在不同文件中，无统一的架构概念
2. **中间判断** — 如 "这个 step 是否支持折叠 streaming" 的判断逻辑，原始数据（toolName + state + partialResult）已存在于 L2，只需在 L2 和 L5 之间补齐判断函数

**核心原则：缺少中间处理层不等于"做不了"，只要原始数据源存在，适配 gap 可通过补齐转换逻辑来弥合。**

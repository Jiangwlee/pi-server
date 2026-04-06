export type User = {
  id: string
  email?: string
  authProvider?: string
  displayName: string
}

export type Session = {
  id: string
  cwd: string
  sessionDir: string
  label: string
  createdAt: number
  updatedAt: number
}

export type Model = {
  id: string
  name?: string
  provider?: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type CreateSessionRequest = {
  cwd?: string
  sessionDir?: string
  label?: string
}

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

export type SendRequest = {
  message: string
  model?: string
  fileIds?: string[]
  thinkingLevel?: ThinkingLevel
}

export type UploadedFile = {
  id: string
  fileName: string
  mimeType: string
  size: number
  thumbnailUrl: string
}

export type ChatAttachment = {
  fileId: string
  fileName: string
  mimeType: string
  thumbnailUrl: string
}

export type SessionStatus = 'idle' | 'running' | 'error'

// --- Content block types (aligned with pi-agent SDK) ---

export type TextContent = { type: 'text'; text: string }
export type ThinkingContent = {
  type: 'thinking'
  thinking: string
  thinkingSignature?: string
  redacted?: boolean
}
export type ImageContent = { type: 'image'; data: string; mimeType: string }
export type ToolCall = {
  type: 'toolCall'
  id: string
  name: string
  arguments: Record<string, unknown>
}

export type ContentBlock = TextContent | ThinkingContent | ToolCall | ImageContent

// --- Metadata types ---

export type Usage = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  cost: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    total: number
  }
}

export type StopReason = 'stop' | 'length' | 'toolUse' | 'error' | 'aborted'

// --- Streaming event types ---

export type AssistantMessageEvent =
  | { type: 'start'; partial: unknown }
  | { type: 'text_start'; contentIndex: number; partial: unknown }
  | { type: 'text_delta'; contentIndex: number; delta: string; partial: unknown }
  | { type: 'text_end'; contentIndex: number; content: string; partial: unknown }
  | { type: 'thinking_start'; contentIndex: number; partial: unknown }
  | { type: 'thinking_delta'; contentIndex: number; delta: string; partial: unknown }
  | { type: 'thinking_end'; contentIndex: number; content: string; partial: unknown }
  | { type: 'toolcall_start'; contentIndex: number; partial: unknown }
  | { type: 'toolcall_delta'; contentIndex: number; delta: string; partial: unknown }
  | { type: 'toolcall_end'; contentIndex: number; toolCall: ToolCall; partial: unknown }
  | { type: 'done'; reason: 'stop' | 'length' | 'toolUse'; message: unknown }
  | { type: 'error'; reason: 'aborted' | 'error'; error: unknown }

export type AgentEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end'; messages: unknown[] }
  | { type: 'turn_start' }
  | {
      type: 'turn_end'
      message: unknown
      toolResults: Array<{
        role: 'toolResult'
        toolCallId: string
        toolName: string
        content: Array<TextContent | ImageContent>
        isError: boolean
        timestamp: number
      }>
    }
  | { type: 'message_start'; message: unknown }
  | {
      type: 'message_update'
      message: unknown
      assistantMessageEvent: AssistantMessageEvent
    }
  | { type: 'message_end'; message: unknown }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_execution_update'; toolCallId: string; toolName: string; args: unknown; partialResult: unknown }
  | { type: 'tool_execution_end'; toolCallId: string; toolName: string; result: unknown; isError: boolean }

// --- Chat message (structured for UI consumption) ---

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: ContentBlock[]
  streaming?: boolean
  usage?: Usage
  stopReason?: StopReason
  model?: string
  toolCallId?: string
  toolName?: string
  isError?: boolean
  timestamp?: number
  attachments?: ChatAttachment[]
}

// --- History entry (loose shape from server JSONL) ---

export type SessionHistoryEntry = {
  type?: string
  message?: {
    role?: string
    content?: unknown
    usage?: Usage
    stopReason?: StopReason
    model?: string
    toolCallId?: string
    toolName?: string
    isError?: boolean
    timestamp?: number
  }
}

// --- Tool render/execution state ---

export type ToolRenderState = 'inprogress' | 'complete' | 'error'

// --- Tool execution tracking (for timeline UI) ---

export type ToolExecution = {
  toolCallId: string
  toolName: string
  state: ToolRenderState
  startTime: number
  partialResult?: ChatMessage
}

export type RenderType = 'full' | 'compact' | 'highlight' | 'inline'

export type SSEEventType = 'pi' | 'status' | 'error'

export type SSEEnvelope = {
  event: SSEEventType
  data: unknown
  id?: string
}

export type ApiClientOptions = {
  basePath?: string
}

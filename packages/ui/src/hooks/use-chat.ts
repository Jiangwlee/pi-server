import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient, ApiError } from '../client/api-client.js'
import {
  connectSSE,
  type ParsedSSEFrame,
  type SSEConnection,
} from '../client/sse-client.js'
import type {
  AgentEvent,
  AssistantMessageEvent,
  ChatAttachment,
  ChatMessage,
  ContentBlock,
  ImageContent,
  SessionHistoryEntry,
  SessionStatus,
  TextContent,
  ThinkingContent,
  ToolCall,
  Usage,
  StopReason,
} from '../client/types.js'

type ChatClient = {
  send: (id: string, input: { message: string; model?: string; fileIds?: string[] }) => Promise<{ ok: true }>
  abort: (id: string) => Promise<{ ok: true }>
  history: (id: string) => Promise<{ messages: SessionHistoryEntry[] }>
}

type ChatSSEConnect = (args: {
  sessionId: string
  onEvent: (frame: ParsedSSEFrame) => void
  onError: (err: unknown) => void
}) => SSEConnection

type UseChatOptions = {
  sessionId: string
  client?: ChatClient
  basePath?: string
  connect?: ChatSSEConnect
}

type UseChatResult = {
  messages: ChatMessage[]
  status: SessionStatus
  error: string | null
  send: (message: string, options?: { model?: string; fileIds?: string[]; attachments?: ChatAttachment[] }) => Promise<void>
  abort: () => Promise<void>
  loadHistory: () => Promise<void>
}

/**
 * Extract text from a ChatMessage's content blocks for simple rendering.
 */
export function getTextContent(msg: ChatMessage): string {
  return msg.content
    .map((block) => {
      if (block.type === 'text') return block.text
      if (block.type === 'thinking') return block.thinking
      return ''
    })
    .filter(Boolean)
    .join('')
}

/**
 * Parse raw content from history entry into ContentBlock[].
 */
function parseContent(raw: unknown): ContentBlock[] {
  if (typeof raw === 'string') {
    return [{ type: 'text', text: raw }]
  }
  if (Array.isArray(raw)) {
    const blocks: ContentBlock[] = []
    for (const item of raw) {
      if (item && typeof item === 'object' && 'type' in item) {
        const t = item as { type: string }
        if (t.type === 'text' && 'text' in item) {
          blocks.push({ type: 'text', text: String((item as TextContent).text) })
        } else if (t.type === 'thinking' && 'thinking' in item) {
          const tc = item as ThinkingContent
          blocks.push({
            type: 'thinking',
            thinking: String(tc.thinking),
            ...(tc.thinkingSignature !== undefined && { thinkingSignature: tc.thinkingSignature }),
            ...(tc.redacted !== undefined && { redacted: tc.redacted }),
          })
        } else if (t.type === 'toolCall' && 'id' in item && 'name' in item) {
          const tc = item as ToolCall
          blocks.push({
            type: 'toolCall',
            id: String(tc.id),
            name: String(tc.name),
            arguments: tc.arguments ?? {},
          })
        } else if (t.type === 'image' && 'data' in item && 'mimeType' in item) {
          const ic = item as ImageContent
          blocks.push({ type: 'image', data: String(ic.data), mimeType: String(ic.mimeType) })
        }
        // skip unknown types
      }
    }
    return blocks
  }
  return []
}

function toChatMessage(entry: SessionHistoryEntry, index: number): ChatMessage | null {
  if (entry.type === 'toolResult') {
    const msg = entry.message
    return {
      id: 'history-tool-' + index,
      role: 'tool',
      content: parseContent(msg?.content),
      toolCallId: msg?.toolCallId,
      toolName: msg?.toolName,
      isError: msg?.isError,
      timestamp: msg?.timestamp,
    }
  }
  const role = entry.message?.role
  if (role !== 'user' && role !== 'assistant') return null
  const msg = entry.message!
  return {
    id: 'history-' + role + '-' + index,
    role,
    content: parseContent(msg.content),
    usage: msg.usage,
    stopReason: msg.stopReason,
    model: msg.model,
    timestamp: msg.timestamp,
  }
}

function defaultConnect(basePath: string): ChatSSEConnect {
  return ({ sessionId, onEvent, onError }) => connectSSE({
    url: `${basePath}/api/sessions/${sessionId}/events`,
    onEvent,
    onError: (err) => onError(err),
  })
}

/**
 * Apply an AssistantMessageEvent delta to a ChatMessage's content array.
 * Returns a new content array (immutable update).
 */
function isValidIndex(idx: unknown): idx is number {
  return typeof idx === 'number' && Number.isInteger(idx) && idx >= 0
}

function ensureLength(arr: ContentBlock[], idx: number): void {
  while (arr.length <= idx) arr.push({ type: 'text', text: '' })
}

function applyDelta(
  content: ContentBlock[],
  evt: AssistantMessageEvent,
): ContentBlock[] {
  if ('contentIndex' in evt && !isValidIndex(evt.contentIndex)) return content

  const next = content.slice()

  switch (evt.type) {
    case 'text_start': {
      const idx = evt.contentIndex
      ensureLength(next, idx)
      if (next[idx].type !== 'text') {
        next[idx] = { type: 'text', text: '' }
      }
      break
    }
    case 'text_delta': {
      const idx = evt.contentIndex
      if (idx < next.length && next[idx].type === 'text') {
        next[idx] = { ...next[idx] as TextContent, text: (next[idx] as TextContent).text + evt.delta }
      } else {
        ensureLength(next, idx)
        next[idx] = { type: 'text', text: evt.delta }
      }
      break
    }
    case 'thinking_start': {
      const idx = evt.contentIndex
      ensureLength(next, idx)
      if (next[idx].type !== 'thinking') {
        next[idx] = { type: 'thinking', thinking: '' }
      }
      break
    }
    case 'thinking_delta': {
      const idx = evt.contentIndex
      if (idx < next.length && next[idx].type === 'thinking') {
        next[idx] = { ...next[idx] as ThinkingContent, thinking: (next[idx] as ThinkingContent).thinking + evt.delta }
      } else {
        ensureLength(next, idx)
        next[idx] = { type: 'thinking', thinking: evt.delta }
      }
      break
    }
    case 'toolcall_start': {
      const idx = evt.contentIndex
      ensureLength(next, idx)
      next[idx] = { type: 'toolCall', id: '', name: '', arguments: {} }
      break
    }
    case 'toolcall_delta': {
      // Accumulate partial JSON for tool arguments — ensure placeholder exists
      const idx = evt.contentIndex
      if (idx >= next.length || next[idx].type !== 'toolCall') {
        ensureLength(next, idx)
        next[idx] = { type: 'toolCall', id: '', name: '', arguments: {} }
      }
      break
    }
    case 'toolcall_end': {
      const idx = evt.contentIndex
      ensureLength(next, idx)
      next[idx] = evt.toolCall
      break
    }
    // text_end, thinking_end, start, done, error — no content mutation needed here
    default:
      break
  }

  return next
}

export function useChat(options: UseChatOptions): UseChatResult {
  const { sessionId, basePath = '/backend' } = options
  const client = useMemo(() => options.client ?? new ApiClient({ basePath }), [options.client, basePath])
  const connect = useMemo(() => options.connect ?? defaultConnect(basePath), [options.connect, basePath])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamMsgRef = useRef<string | null>(null)

  const nextId = useCallback((prefix: string): string => {
    const random = globalThis.crypto?.randomUUID?.() ?? `${sessionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    return `${prefix}-${random}`
  }, [sessionId])

  const loadHistory = useCallback(async (): Promise<void> => {
    const history = await client.history(sessionId)
    const next = history.messages
      .map((entry, index) => toChatMessage(entry, index))
      .filter((entry): entry is ChatMessage => Boolean(entry))
    setMessages(next)
  }, [client, sessionId])

  useEffect(() => {
    streamMsgRef.current = null
    setMessages([])
    setStatus('idle')
    setError(null)

    const connection = connect({
      sessionId,
      onEvent: (frame) => {
        if (frame.event === 'status') {
          const payload = frame.data as { status?: SessionStatus }
          if (payload.status) {
            setStatus(payload.status)
            // Don't loadHistory on status change — agent_end handles authoritative reload.
            // Calling it here races with streaming state and can wipe in-flight messages.
          }
          return
        }

        if (frame.event === 'error') {
          const payload = frame.data as { message?: string }
          setStatus('error')
          setError(payload.message ?? 'Unknown runtime error')
          return
        }

        if (frame.event === 'pi') {
          const agentEvent = frame.data as AgentEvent
          if (!agentEvent || typeof agentEvent !== 'object' || !('type' in agentEvent)) return

          switch (agentEvent.type) {
            case 'agent_start':
            case 'turn_start':
            case 'tool_execution_start':
            case 'tool_execution_update':
            case 'tool_execution_end':
              // no-op for now
              break

            case 'message_start': {
              // SDK emits message_start for both user and assistant messages.
              // Only create a streaming placeholder for assistant messages.
              const startMsg = (agentEvent as { message?: { role?: string } }).message
              if (startMsg?.role !== 'assistant') break

              const msgId = nextId('stream')
              const prevStreamId = streamMsgRef.current
              streamMsgRef.current = msgId
              setMessages((prev) => {
                // Finalize any stale streaming message from a previous message_start
                let cleaned = prev
                if (prevStreamId) {
                  const staleIdx = cleaned.findIndex((m) => m.id === prevStreamId && m.streaming)
                  if (staleIdx !== -1) {
                    cleaned = cleaned.slice()
                    cleaned[staleIdx] = { ...cleaned[staleIdx], streaming: false }
                  }
                }
                return [
                  ...cleaned,
                  {
                    id: msgId,
                    role: 'assistant',
                    content: [],
                    streaming: true,
                  },
                ]
              })
              break
            }

            case 'message_update': {
              const evt = agentEvent.assistantMessageEvent
              const currentId = streamMsgRef.current
              if (!currentId) break

              // Handle done/error at the AssistantMessageEvent level
              if (evt.type === 'done' || evt.type === 'error') {
                const finalMsg = evt.type === 'done' ? evt.message : evt.error
                const parsed = finalMsg as {
                  usage?: Usage
                  stopReason?: StopReason
                  model?: string
                  content?: unknown
                } | undefined
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === currentId)
                  if (idx === -1) return prev
                  const next = prev.slice()
                  const updated: ChatMessage = { ...next[idx], streaming: false }
                  if (parsed?.usage) updated.usage = parsed.usage
                  if (parsed?.stopReason) updated.stopReason = parsed.stopReason
                  if (parsed?.model) updated.model = parsed.model
                  if (parsed?.content) updated.content = parseContent(parsed.content)
                  next[idx] = updated
                  return next
                })
                break
              }

              // Apply content deltas
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === currentId)
                if (idx === -1) return prev
                const next = prev.slice()
                next[idx] = {
                  ...next[idx],
                  content: applyDelta(next[idx].content, evt),
                }
                return next
              })
              break
            }

            case 'message_end': {
              const currentId = streamMsgRef.current
              if (!currentId) break
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === currentId)
                if (idx === -1) return prev
                const next = prev.slice()
                next[idx] = { ...next[idx], streaming: false }
                return next
              })
              streamMsgRef.current = null
              break
            }

            case 'turn_end': {
              // Add tool results as separate ChatMessage entries
              if ('toolResults' in agentEvent && Array.isArray(agentEvent.toolResults)) {
                const toolMsgs: ChatMessage[] = agentEvent.toolResults.map((tr, i) => ({
                  id: nextId(`tool-${i}`),
                  role: 'tool' as const,
                  content: parseContent(tr.content),
                  toolCallId: tr.toolCallId,
                  toolName: tr.toolName,
                  isError: tr.isError,
                  timestamp: tr.timestamp,
                }))
                if (toolMsgs.length > 0) {
                  setMessages((prev) => [...prev, ...toolMsgs])
                }
              }
              break
            }

            case 'agent_end': {
              // Reload history for authoritative state
              void loadHistory()
              break
            }
          }
        }
      },
      onError: (err) => {
        console.error('[useChat] SSE error:', err instanceof Error ? err.message : err)
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      },
    })

    void loadHistory()

    return () => {
      connection.close()
    }
  }, [connect, loadHistory, nextId, sessionId])

  const send = useCallback(async (message: string, options?: { model?: string; fileIds?: string[]; attachments?: ChatAttachment[] }): Promise<void> => {
    const text = message.trim()
    if (!text) return
    const optimisticId = nextId('local-user')
    setError(null)
    setStatus('running')
    setMessages((prev) => [...prev, {
      id: optimisticId,
      role: 'user',
      content: [{ type: 'text', text }],
      attachments: options?.attachments,
    }])

    try {
      await client.send(sessionId, { message: text, model: options?.model, fileIds: options?.fileIds })
    } catch (err) {
      console.error('[useChat] send failed:', err instanceof ApiError ? `${err.status} ${err.body}` : err)
      setStatus('error')
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      if (err instanceof ApiError && err.status === 409) {
        setError('Session is busy')
        return
      }
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many concurrent sessions')
        return
      }
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    }
  }, [client, nextId, sessionId])

  const abort = useCallback(async (): Promise<void> => {
    setError(null)
    await client.abort(sessionId)
  }, [client, sessionId])

  return {
    messages,
    status,
    error,
    send,
    abort,
    loadHistory,
  }
}

// Exported for testing
export { toChatMessage, parseContent, applyDelta }

export type { ChatMessage, ContentBlock, UseChatOptions, UseChatResult, ChatSSEConnect }

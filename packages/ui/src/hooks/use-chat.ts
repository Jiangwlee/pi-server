import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient, ApiError } from '../client/api-client.js'
import {
  connectSSE,
  type ParsedSSEFrame,
  type SSEConnection,
} from '../client/sse-client.js'
import type { SessionHistoryEntry, SessionStatus } from '../client/types.js'

type ChatClient = {
  send: (id: string, input: { message: string }) => Promise<{ ok: true }>
  abort: (id: string) => Promise<{ ok: true }>
  history: (id: string) => Promise<{ messages: SessionHistoryEntry[] }>
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  raw?: unknown
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
  send: (message: string) => Promise<void>
  abort: () => Promise<void>
  loadHistory: () => Promise<void>
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.map((part) => extractText(part)).filter(Boolean).join('')
  }
  if (!value || typeof value !== 'object') return ''
  const obj = value as Record<string, unknown>
  if (typeof obj.text === 'string') return obj.text
  if (typeof obj.delta === 'string') return obj.delta
  if (obj.message) return extractText(obj.message)
  if (obj.content) return extractText(obj.content)
  return ''
}

function toChatMessage(entry: SessionHistoryEntry, index: number): ChatMessage | null {
  if (entry.type === 'toolResult') {
    return {
      id: 'history-tool-' + index,
      role: 'tool',
      content: extractText(entry.message?.content),
      raw: entry,
    }
  }
  const role = entry.message?.role
  if (role !== 'user' && role !== 'assistant') return null
  return {
    id: 'history-' + role + '-' + index,
    role,
    content: extractText(entry.message?.content),
    raw: entry,
  }
}

function defaultConnect(basePath: string): ChatSSEConnect {
  return ({ sessionId, onEvent, onError }) => connectSSE({
    url: `${basePath}/api/sessions/${sessionId}/events`,
    onEvent,
    onError: (err) => onError(err),
  })
}

export function useChat(options: UseChatOptions): UseChatResult {
  const { sessionId, basePath = '/backend' } = options
  const client = useMemo(() => options.client ?? new ApiClient({ basePath }), [options.client, basePath])
  const connect = useMemo(() => options.connect ?? defaultConnect(basePath), [options.connect, basePath])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamIdRef = useRef<string>('stream-' + sessionId)

  const loadHistory = useCallback(async (): Promise<void> => {
    const history = await client.history(sessionId)
    const next = history.messages
      .map((entry, index) => toChatMessage(entry, index))
      .filter((entry): entry is ChatMessage => Boolean(entry))
    setMessages(next)
  }, [client, sessionId])

  useEffect(() => {
    streamIdRef.current = 'stream-' + sessionId
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
            if (payload.status === 'idle' || payload.status === 'error') {
              void loadHistory()
            }
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
          const text = extractText(frame.data)
          if (!text) return
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === streamIdRef.current)
            if (idx === -1) {
              return [...prev, {
                id: streamIdRef.current,
                role: 'assistant',
                content: text,
                raw: frame.data,
              }]
            }
            const next = prev.slice()
            next[idx] = {
              ...next[idx],
              content: next[idx].content + text,
              raw: frame.data,
            }
            return next
          })
        }
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      },
    })

    void loadHistory()

    return () => {
      connection.close()
    }
  }, [connect, loadHistory, sessionId])

  const send = useCallback(async (message: string): Promise<void> => {
    const text = message.trim()
    if (!text) return
    const optimisticId = 'local-user-' + Date.now()
    setError(null)
    setStatus('running')
    setMessages((prev) => [...prev, {
      id: optimisticId,
      role: 'user',
      content: text,
    }])

    try {
      await client.send(sessionId, { message: text })
    } catch (err) {
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
  }, [client, sessionId])

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

export type { ChatMessage, UseChatOptions, UseChatResult, ChatSSEConnect }

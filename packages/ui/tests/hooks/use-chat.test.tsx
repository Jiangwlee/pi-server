// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ApiError } from '../../src/client/api-client.js'
import {
  useChat,
  toChatMessage,
  parseContent,
  applyDelta,
  getTextContent,
  type ChatSSEConnect,
  type ChatMessage,
} from '../../src/hooks/use-chat.js'
import type { SessionHistoryEntry, ContentBlock, AssistantMessageEvent } from '../../src/client/types.js'

function makeConnect() {
  let onEvent: ((frame: { event: string; data: unknown }) => void) | null = null
  let onError: ((err: unknown) => void) | null = null
  const connect: ChatSSEConnect = ({ onEvent: nextOnEvent, onError: nextOnError }) => {
    onEvent = nextOnEvent
    onError = nextOnError
    return {
      close: () => {},
      done: Promise.resolve(),
    }
  }
  return {
    connect,
    emitEvent(frame: { event: string; data: unknown }) {
      onEvent?.(frame)
    },
    emitError(err: unknown) {
      onError?.(err)
    },
  }
}

function makeClient(history: SessionHistoryEntry[] = []) {
  let sentMessage = ''
  return {
    client: {
      send: async (_sessionId: string, input: { message: string }) => {
        sentMessage = input.message
        return { ok: true as const }
      },
      abort: async () => ({ ok: true as const }),
      history: async () => ({ messages: history }),
    },
    getSentMessage: () => sentMessage,
  }
}

// --- Unit tests for pure functions ---

describe('parseContent', () => {
  it('wraps string in TextContent', () => {
    expect(parseContent('hello')).toEqual([{ type: 'text', text: 'hello' }])
  })

  it('parses array of typed content blocks', () => {
    const raw = [
      { type: 'text', text: 'hello' },
      { type: 'thinking', thinking: 'hmm' },
      { type: 'toolCall', id: 'tc1', name: 'readFile', arguments: { path: '/foo' } },
    ]
    expect(parseContent(raw)).toEqual(raw)
  })

  it('parses ImageContent blocks', () => {
    const raw = [
      { type: 'text', text: 'ok' },
      { type: 'image', data: 'base64data', mimeType: 'image/png' },
    ]
    expect(parseContent(raw)).toEqual([
      { type: 'text', text: 'ok' },
      { type: 'image', data: 'base64data', mimeType: 'image/png' },
    ])
  })

  it('filters out unknown types', () => {
    const raw = [
      { type: 'text', text: 'ok' },
      { type: 'unknown', foo: 'bar' },
    ]
    expect(parseContent(raw)).toEqual([{ type: 'text', text: 'ok' }])
  })

  it('returns empty array for non-string non-array', () => {
    expect(parseContent(undefined)).toEqual([])
    expect(parseContent(42)).toEqual([])
    expect(parseContent(null)).toEqual([])
  })
})

describe('toChatMessage', () => {
  it('maps user history entry with string content', () => {
    const entry: SessionHistoryEntry = {
      message: { role: 'user', content: 'hello' },
    }
    const result = toChatMessage(entry, 0)!
    expect(result.id).toBe('history-user-0')
    expect(result.role).toBe('user')
    expect(result.content).toEqual([{ type: 'text', text: 'hello' }])
  })

  it('maps assistant history entry with structured content', () => {
    const entry: SessionHistoryEntry = {
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'let me think' },
          { type: 'text', text: 'the answer is 42' },
        ],
        usage: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0, totalTokens: 30, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: 'stop',
        model: 'test-model',
      },
    }
    const result = toChatMessage(entry, 5)!
    expect(result.id).toBe('history-assistant-5')
    expect(result.role).toBe('assistant')
    expect(result.content).toHaveLength(2)
    expect(result.content[0].type).toBe('thinking')
    expect(result.content[1].type).toBe('text')
    expect(result.usage?.totalTokens).toBe(30)
    expect(result.stopReason).toBe('stop')
    expect(result.model).toBe('test-model')
  })

  it('maps toolResult history entry', () => {
    const entry: SessionHistoryEntry = {
      type: 'toolResult',
      message: {
        role: 'toolResult',
        content: [{ type: 'text', text: 'file contents' }],
        toolCallId: 'tc1',
        toolName: 'readFile',
        isError: false,
        timestamp: 1000,
      },
    }
    const result = toChatMessage(entry, 3)!
    expect(result.id).toBe('history-tool-3')
    expect(result.role).toBe('tool')
    expect(result.toolCallId).toBe('tc1')
    expect(result.toolName).toBe('readFile')
    expect(result.isError).toBe(false)
  })

  it('returns null for unknown roles', () => {
    expect(toChatMessage({ message: { role: 'system' } }, 0)).toBeNull()
    expect(toChatMessage({}, 0)).toBeNull()
  })
})

describe('applyDelta', () => {
  it('text_delta appends to existing TextContent', () => {
    const content: ContentBlock[] = [{ type: 'text', text: 'he' }]
    const result = applyDelta(content, { type: 'text_delta', contentIndex: 0, delta: 'llo', partial: {} })
    expect(result[0]).toEqual({ type: 'text', text: 'hello' })
  })

  it('text_delta creates TextContent at new index', () => {
    const content: ContentBlock[] = []
    const result = applyDelta(content, { type: 'text_delta', contentIndex: 0, delta: 'hi', partial: {} })
    expect(result[0]).toEqual({ type: 'text', text: 'hi' })
  })

  it('thinking_delta appends to existing ThinkingContent', () => {
    const content: ContentBlock[] = [{ type: 'thinking', thinking: 'hmm' }]
    const result = applyDelta(content, { type: 'thinking_delta', contentIndex: 0, delta: '...', partial: {} })
    expect(result[0]).toEqual({ type: 'thinking', thinking: 'hmm...' })
  })

  it('thinking_delta creates ThinkingContent at new index', () => {
    const content: ContentBlock[] = []
    const result = applyDelta(content, { type: 'thinking_delta', contentIndex: 0, delta: 'think', partial: {} })
    expect(result[0]).toEqual({ type: 'thinking', thinking: 'think' })
  })

  it('toolcall_end replaces with complete ToolCall', () => {
    const content: ContentBlock[] = [{ type: 'toolCall', id: '', name: '', arguments: {} }]
    const toolCall = { type: 'toolCall' as const, id: 'tc1', name: 'readFile', arguments: { path: '/foo' } }
    const result = applyDelta(content, { type: 'toolcall_end', contentIndex: 0, toolCall, partial: {} })
    expect(result[0]).toEqual(toolCall)
  })

  it('text_start ensures TextContent exists at index', () => {
    const content: ContentBlock[] = []
    const result = applyDelta(content, { type: 'text_start', contentIndex: 0, partial: {} })
    expect(result[0]).toEqual({ type: 'text', text: '' })
  })

  it('handles gap indices by padding', () => {
    const content: ContentBlock[] = [{ type: 'thinking', thinking: 'x' }]
    const result = applyDelta(content, { type: 'text_delta', contentIndex: 2, delta: 'hi', partial: {} })
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ type: 'text', text: 'hi' })
  })

  it('returns original content for negative contentIndex', () => {
    const content: ContentBlock[] = [{ type: 'text', text: 'hello' }]
    const result = applyDelta(content, { type: 'text_delta', contentIndex: -1, delta: 'bad', partial: {} } as AssistantMessageEvent)
    expect(result).toEqual(content)
  })

  it('returns original content for NaN contentIndex', () => {
    const content: ContentBlock[] = [{ type: 'text', text: 'hello' }]
    const result = applyDelta(content, { type: 'text_delta', contentIndex: NaN, delta: 'bad', partial: {} } as AssistantMessageEvent)
    expect(result).toEqual(content)
  })

  it('returns original content for non-integer contentIndex', () => {
    const content: ContentBlock[] = [{ type: 'text', text: 'hello' }]
    const result = applyDelta(content, { type: 'text_delta', contentIndex: 1.5, delta: 'bad', partial: {} } as AssistantMessageEvent)
    expect(result).toEqual(content)
  })

  it('toolcall_delta ensures placeholder ToolCall exists', () => {
    const content: ContentBlock[] = []
    const result = applyDelta(content, { type: 'toolcall_delta', contentIndex: 0, delta: '{"path":', partial: {} })
    expect(result[0]).toEqual({ type: 'toolCall', id: '', name: '', arguments: {} })
  })

  it('toolcall_delta preserves existing ToolCall', () => {
    const content: ContentBlock[] = [{ type: 'toolCall', id: 'tc1', name: 'read', arguments: {} }]
    const result = applyDelta(content, { type: 'toolcall_delta', contentIndex: 0, delta: '...', partial: {} })
    expect(result[0]).toEqual({ type: 'toolCall', id: 'tc1', name: 'read', arguments: {} })
  })
})

describe('getTextContent', () => {
  it('extracts text and thinking from content blocks', () => {
    const msg: ChatMessage = {
      id: 'test',
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'hmm' },
        { type: 'text', text: 'answer' },
        { type: 'toolCall', id: 'tc1', name: 'read', arguments: {} },
      ],
    }
    expect(getTextContent(msg)).toBe('hmmanswer')
  })

  it('returns empty string for empty content', () => {
    const msg: ChatMessage = { id: 'test', role: 'user', content: [] }
    expect(getTextContent(msg)).toBe('')
  })
})

// --- Integration tests for useChat hook ---

describe('useChat', () => {
  it('send creates optimistic user message with structured content', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    // Wait for initial history load to settle
    await waitFor(() => {
      expect(result.current.status).toBe('idle')
    })

    await act(async () => {
      await result.current.send('hello')
    })

    const userMsg = result.current.messages.find((m) => m.role === 'user')
    expect(userMsg).toBeDefined()
    expect(userMsg!.content).toEqual([{ type: 'text', text: 'hello' }])
  })

  it('send 409 error removes optimistic message', async () => {
    const busyClient = {
      send: async () => { throw new ApiError(409, 'busy') },
      abort: async () => ({ ok: true as const }),
      history: async () => ({ messages: [] as SessionHistoryEntry[] }),
    }
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client: busyClient, connect: sse.connect }))

    await act(async () => {
      await result.current.send('hello')
    })

    expect(result.current.error).toBe('Session is busy')
    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(0)
  })

  it('send 429 error removes optimistic message', async () => {
    const limitClient = {
      send: async () => { throw new ApiError(429, 'limit') },
      abort: async () => ({ ok: true as const }),
      history: async () => ({ messages: [] as SessionHistoryEntry[] }),
    }
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client: limitClient, connect: sse.connect }))

    await act(async () => {
      await result.current.send('hello')
    })
    expect(result.current.error).toBe('Too many concurrent sessions')
  })

  it('SSE message_start creates a streaming ChatMessage', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    // Wait for initial history load to settle
    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: { type: 'message_start', message: {} },
      })
    })

    await waitFor(() => {
      const streamMsg = result.current.messages.find((m) => m.role === 'assistant' && m.streaming)
      expect(streamMsg).toBeDefined()
      expect(streamMsg!.content).toEqual([])
      expect(streamMsg!.streaming).toBe(true)
    })
  })

  it('SSE message_update with text_delta appends to correct contentIndex', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_start', message: {} } })
    })

    await waitFor(() => {
      expect(result.current.messages.some((m) => m.streaming)).toBe(true)
    })

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'message_update',
          message: {},
          assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'hello', partial: {} },
        },
      })
    })

    await waitFor(() => {
      const msg = result.current.messages.find((m) => m.streaming)
      expect(msg!.content[0]).toEqual({ type: 'text', text: 'hello' })
    })

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'message_update',
          message: {},
          assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: ' world', partial: {} },
        },
      })
    })

    await waitFor(() => {
      const msg = result.current.messages.find((m) => m.streaming)
      expect(msg!.content[0]).toEqual({ type: 'text', text: 'hello world' })
    })
  })

  it('SSE message_update with thinking_delta appends to correct contentIndex', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_start', message: {} } })
    })

    await waitFor(() => {
      expect(result.current.messages.some((m) => m.streaming)).toBe(true)
    })

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'message_update',
          message: {},
          assistantMessageEvent: { type: 'thinking_delta', contentIndex: 0, delta: 'let me', partial: {} },
        },
      })
    })

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'message_update',
          message: {},
          assistantMessageEvent: { type: 'thinking_delta', contentIndex: 0, delta: ' think', partial: {} },
        },
      })
    })

    await waitFor(() => {
      const msg = result.current.messages.find((m) => m.streaming)
      expect(msg!.content[0]).toEqual({ type: 'thinking', thinking: 'let me think' })
    })
  })

  it('SSE message_end marks streaming=false', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_start', message: {} } })
    })

    await waitFor(() => {
      expect(result.current.messages.some((m) => m.streaming)).toBe(true)
    })

    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_end', message: {} } })
    })

    await waitFor(() => {
      const msg = result.current.messages.find((m) => m.role === 'assistant')
      expect(msg).toBeDefined()
      expect(msg!.streaming).toBe(false)
    })
  })

  it('SSE turn_end adds tool results', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'turn_end',
          message: {},
          toolResults: [
            {
              role: 'toolResult',
              toolCallId: 'tc1',
              toolName: 'readFile',
              content: [{ type: 'text', text: 'file contents' }],
              isError: false,
              timestamp: 1000,
            },
          ],
        },
      })
    })

    await waitFor(() => {
      const toolMsg = result.current.messages.find((m) => m.role === 'tool')
      expect(toolMsg).toBeDefined()
      expect(toolMsg!.toolCallId).toBe('tc1')
      expect(toolMsg!.toolName).toBe('readFile')
      expect(toolMsg!.content).toEqual([{ type: 'text', text: 'file contents' }])
    })
  })

  it('status idle reloads history with structured content', async () => {
    const history: SessionHistoryEntry[] = [
      { message: { role: 'assistant', content: [{ type: 'text', text: 'world' }] } },
    ]
    const { client } = makeClient(history)
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    act(() => {
      sse.emitEvent({ event: 'status', data: { status: 'idle' } })
    })

    await waitFor(() => {
      expect(result.current.status).toBe('idle')
      const assistantMsg = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistantMsg).toBeDefined()
      expect(assistantMsg!.content).toEqual([{ type: 'text', text: 'world' }])
    })
  })

  it('SSE message_update with done finalizes message with usage', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_start', message: {} } })
    })

    await waitFor(() => {
      expect(result.current.messages.some((m) => m.streaming)).toBe(true)
    })

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'message_update',
          message: {},
          assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'answer', partial: {} },
        },
      })
    })

    const usage = { input: 10, output: 20, cacheRead: 0, cacheWrite: 0, totalTokens: 30, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }
    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'message_update',
          message: {},
          assistantMessageEvent: {
            type: 'done',
            reason: 'stop',
            message: {
              content: [{ type: 'text', text: 'answer' }],
              usage,
              stopReason: 'stop',
              model: 'test-model',
            },
          },
        },
      })
    })

    await waitFor(() => {
      const msg = result.current.messages.find((m) => m.role === 'assistant')
      expect(msg!.streaming).toBe(false)
      expect(msg!.usage).toEqual(usage)
      expect(msg!.stopReason).toBe('stop')
      expect(msg!.model).toBe('test-model')
    })
  })

  it('SSE message_update with error finalizes message', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_start', message: {} } })
    })

    await waitFor(() => {
      expect(result.current.messages.some((m) => m.streaming)).toBe(true)
    })

    act(() => {
      sse.emitEvent({
        event: 'pi',
        data: {
          type: 'message_update',
          message: {},
          assistantMessageEvent: {
            type: 'error',
            reason: 'aborted',
            error: { stopReason: 'aborted' },
          },
        },
      })
    })

    await waitFor(() => {
      const msg = result.current.messages.find((m) => m.role === 'assistant')
      expect(msg!.streaming).toBe(false)
      expect(msg!.stopReason).toBe('aborted')
    })
  })

  it('duplicate message_start finalizes previous streaming message', async () => {
    const { client } = makeClient()
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await waitFor(() => expect(result.current.status).toBe('idle'))

    // First message_start
    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_start', message: {} } })
    })

    await waitFor(() => {
      expect(result.current.messages.filter((m) => m.streaming)).toHaveLength(1)
    })

    // Second message_start without message_end — should finalize the first
    act(() => {
      sse.emitEvent({ event: 'pi', data: { type: 'message_start', message: {} } })
    })

    await waitFor(() => {
      const assistantMsgs = result.current.messages.filter((m) => m.role === 'assistant')
      expect(assistantMsgs).toHaveLength(2)
      // First should be finalized
      expect(assistantMsgs[0].streaming).toBe(false)
      // Second should be streaming
      expect(assistantMsgs[1].streaming).toBe(true)
    })
  })

  it('abort calls client.abort', async () => {
    let called = false
    const client = {
      send: async () => ({ ok: true as const }),
      abort: async () => { called = true; return { ok: true as const } },
      history: async () => ({ messages: [] as SessionHistoryEntry[] }),
    }
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await act(async () => {
      await result.current.abort()
    })
    expect(called).toBe(true)
  })
})

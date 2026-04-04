// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ApiError } from '../../src/client/api-client.js'
import { useChat, type ChatSSEConnect } from '../../src/hooks/use-chat.js'
import type { SessionHistoryEntry } from '../../src/client/types.js'

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

describe('useChat', () => {
  it('send + status idle refreshes history', async () => {
    let history: SessionHistoryEntry[] = []
    let sentMessage = ''
    const client = {
      send: async (_sessionId: string, input: { message: string }) => {
        sentMessage = input.message
        return { ok: true as const }
      },
      abort: async () => ({ ok: true as const }),
      history: async () => ({ messages: history }),
    }
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client, connect: sse.connect }))

    await act(async () => {
      await result.current.send('hello')
    })

    expect(sentMessage).toBe('hello')

    history = [{
      message: {
        role: 'assistant',
        content: 'world',
      },
    }]
    act(() => {
      sse.emitEvent({ event: 'status', data: { status: 'idle' } })
    })

    await waitFor(() => {
      expect(result.current.status).toBe('idle')
      expect(result.current.messages.some((m) => m.role === 'assistant' && m.content === 'world')).toBe(true)
    })
  })

  it('maps 409/429 to friendly errors', async () => {
    const busyClient = {
      send: async () => {
        throw new ApiError(409, 'busy')
      },
      abort: async () => ({ ok: true as const }),
      history: async () => ({ messages: [] as SessionHistoryEntry[] }),
    }
    const sse = makeConnect()
    const { result } = renderHook(() => useChat({ sessionId: 's1', client: busyClient, connect: sse.connect }))

    await act(async () => {
      await result.current.send('hello')
    })
    expect(result.current.error).toBe('Session is busy')

    const limitClient = {
      ...busyClient,
      send: async () => {
        throw new ApiError(429, 'limit')
      },
    }
    const sse2 = makeConnect()
    const { result: result2 } = renderHook(() => useChat({ sessionId: 's1', client: limitClient, connect: sse2.connect }))
    await act(async () => {
      await result2.current.send('hello')
    })
    expect(result2.current.error).toBe('Too many concurrent sessions')
  })

  it('abort calls client.abort', async () => {
    let called = false
    const client = {
      send: async () => ({ ok: true as const }),
      abort: async () => {
        called = true
        return { ok: true as const }
      },
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

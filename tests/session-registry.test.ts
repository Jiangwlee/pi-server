import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SessionRegistry, type SSEClientHandler, type SSEEnvelope, type SdkSession } from '../src/runtime/session-registry.js'

function createMockSdkSession(events: unknown[] = []): SdkSession {
  let listener: ((event: unknown) => void) | null = null
  return {
    prompt: vi.fn().mockImplementation(async () => {
      // Emit events asynchronously
      for (const event of events) {
        listener?.(event)
      }
    }),
    abort: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockImplementation((fn: (event: unknown) => void) => {
      listener = fn
      return () => { listener = null }
    }),
    dispose: vi.fn(),
  }
}

function createMockFactory(session?: SdkSession) {
  const mock = session ?? createMockSdkSession([
    { type: 'message_start' },
    { type: 'message_update', content: 'Hello' },
    { type: 'message_end' },
  ])
  return vi.fn().mockResolvedValue(mock)
}

describe('SessionRegistry', () => {
  let registry: SessionRegistry

  beforeEach(() => {
    registry = new SessionRegistry({
      createSession: createMockFactory(),
      ringBufferSize: 200,
      maxConcurrentPerUser: 3,
    })
  })

  it('should transition status: idle → running → idle after send', async () => {
    expect(registry.getStatus('sess-1')).toBe('idle')

    const promise = registry.send('sess-1', 'user-1', '/path/session.jsonl', '/workspace', 'Hello')
    expect(registry.getStatus('sess-1')).toBe('running')

    await promise
    expect(registry.getStatus('sess-1')).toBe('idle')
  })

  it('should throw 409 when sending to a running session', async () => {
    const slowSession = createMockSdkSession()
    slowSession.prompt = vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves

    const factory = vi.fn().mockResolvedValue(slowSession)
    registry = new SessionRegistry({
      createSession: factory,
      ringBufferSize: 200,
      maxConcurrentPerUser: 3,
    })

    registry.send('sess-1', 'user-1', '/path/s.jsonl', '/ws', 'Hello') // starts running, never completes

    await expect(
      registry.send('sess-1', 'user-1', '/path/s.jsonl', '/ws', 'Again')
    ).rejects.toThrow('Session is busy')
  })

  it('should enforce per-user concurrent session limit', async () => {
    registry = new SessionRegistry({
      createSession: vi.fn().mockResolvedValue(createMockSdkSession()),
      ringBufferSize: 200,
      maxConcurrentPerUser: 2,
    })

    // Mock slow sessions that never complete
    const neverComplete = () => {
      const s = createMockSdkSession()
      s.prompt = vi.fn().mockImplementation(() => new Promise(() => {}))
      return s
    }

    registry = new SessionRegistry({
      createSession: vi.fn().mockResolvedValue(neverComplete()),
      ringBufferSize: 200,
      maxConcurrentPerUser: 2,
    })

    registry.send('s1', 'user-1', '/p1', '/w1', 'msg1')
    registry.send('s2', 'user-1', '/p2', '/w2', 'msg2')

    await expect(
      registry.send('s3', 'user-1', '/p3', '/w3', 'msg3')
    ).rejects.toThrow('concurrent')
  })

  it('should abort a running session', async () => {
    const sdkSession = createMockSdkSession()
    sdkSession.prompt = vi.fn().mockImplementation(() => new Promise(() => {}))
    const factory = vi.fn().mockResolvedValue(sdkSession)

    registry = new SessionRegistry({
      createSession: factory,
      ringBufferSize: 200,
      maxConcurrentPerUser: 3,
    })

    registry.send('sess-1', 'user-1', '/p', '/w', 'Hello')

    // Wait for factory to resolve and session to start running
    await new Promise(r => setTimeout(r, 10))

    await registry.abort('sess-1')
    expect(sdkSession.abort).toHaveBeenCalled()
  })

  it('should deliver SSE events to subscribed handlers', async () => {
    const events: SSEEnvelope[] = []
    const handler: SSEClientHandler = (e) => events.push(e)

    registry.subscribe('sess-1', handler)
    await registry.send('sess-1', 'user-1', '/p', '/w', 'Hello')

    // Should have received pi events + status events
    expect(events.length).toBeGreaterThan(0)
    const statusEvents = events.filter(e => e.event === 'status')
    expect(statusEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('should not crash when one SSE handler throws', async () => {
    const goodEvents: SSEEnvelope[] = []
    const badHandler: SSEClientHandler = () => { throw new Error('bad handler') }
    const goodHandler: SSEClientHandler = (e) => goodEvents.push(e)

    registry.subscribe('sess-1', badHandler)
    registry.subscribe('sess-1', goodHandler)

    await registry.send('sess-1', 'user-1', '/p', '/w', 'Hello')

    expect(goodEvents.length).toBeGreaterThan(0)
  })

  it('should limit ring buffer to configured size', async () => {
    const manyEvents = Array.from({ length: 250 }, (_, i) => ({
      type: 'message_update',
      content: `msg-${i}`,
    }))

    registry = new SessionRegistry({
      createSession: createMockFactory(createMockSdkSession(manyEvents)),
      ringBufferSize: 200,
      maxConcurrentPerUser: 3,
    })

    await registry.send('sess-1', 'user-1', '/p', '/w', 'Hello')
    const buffer = registry.getRingBuffer('sess-1')
    expect(buffer.length).toBeLessThanOrEqual(200)
  })

  it('should support reconnection with lastSeq', async () => {
    await registry.send('sess-1', 'user-1', '/p', '/w', 'Hello')

    const buffer = registry.getRingBuffer('sess-1')
    const midSeq = Math.floor(buffer.length / 2)

    const replayed = registry.getBufferSince('sess-1', midSeq)
    expect(replayed.length).toBeLessThan(buffer.length)
    expect(replayed[0].id).toBeGreaterThan(midSeq)
  })

  it('should set status to error when prompt rejects', async () => {
    const errorSession = createMockSdkSession()
    errorSession.prompt = vi.fn().mockRejectedValue(new Error('LLM failed'))

    registry = new SessionRegistry({
      createSession: vi.fn().mockResolvedValue(errorSession),
      ringBufferSize: 200,
      maxConcurrentPerUser: 3,
    })

    const events: SSEEnvelope[] = []
    registry.subscribe('sess-1', (e) => events.push(e))

    await registry.send('sess-1', 'user-1', '/p', '/w', 'Hello')

    expect(registry.getStatus('sess-1')).toBe('error')

    const errorEvents = events.filter(e => e.event === 'error')
    expect(errorEvents.length).toBe(1)
  })

  it('should dispose all sessions on dispose()', async () => {
    const sdkSession = createMockSdkSession()
    sdkSession.prompt = vi.fn().mockImplementation(() => new Promise(() => {}))
    const factory = vi.fn().mockResolvedValue(sdkSession)

    registry = new SessionRegistry({
      createSession: factory,
      ringBufferSize: 200,
      maxConcurrentPerUser: 3,
    })

    registry.send('sess-1', 'user-1', '/p', '/w', 'Hello')

    // Wait a tick for the session to start
    await new Promise(r => setTimeout(r, 10))

    registry.dispose()
    expect(sdkSession.abort).toHaveBeenCalled()
  })
})

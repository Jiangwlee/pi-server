export type SessionStatus = 'idle' | 'running' | 'error'

export type SSEEnvelope = {
  event: 'pi' | 'status' | 'error'
  data: string
  id: number
}

export type SSEClientHandler = (envelope: SSEEnvelope) => void

export type SdkSession = {
  prompt: (text: string) => Promise<void>
  abort: () => Promise<void>
  subscribe: (listener: (event: unknown) => void) => () => void
  dispose: () => void
}

type SessionFactory = (sessionPath: string, cwd: string) => Promise<SdkSession>

interface SessionEntry {
  sdkSession: SdkSession | null
  status: SessionStatus
  userId: string | null
  sseClients: Set<SSEClientHandler>
  ringBuffer: SSEEnvelope[]
  seq: number
  unsubscribe: (() => void) | null
  timer: ReturnType<typeof setTimeout> | null
}

interface SessionRegistryOptions {
  createSession: SessionFactory
  ringBufferSize: number
  maxConcurrentPerUser: number
  promptTimeoutMs?: number
}

export class SessionRegistry {
  private entries = new Map<string, SessionEntry>()
  private options: SessionRegistryOptions

  constructor(options: SessionRegistryOptions) {
    this.options = options
  }

  private getOrCreateEntry(sessionId: string): SessionEntry {
    let entry = this.entries.get(sessionId)
    if (!entry) {
      entry = {
        sdkSession: null,
        status: 'idle',
        userId: null,
        sseClients: new Set(),
        ringBuffer: [],
        seq: 0,
        unsubscribe: null,
        timer: null,
      }
      this.entries.set(sessionId, entry)
    }
    return entry
  }

  send(
    sessionId: string,
    userId: string,
    sessionPath: string,
    cwd: string,
    message: string,
  ): Promise<void> {
    const entry = this.getOrCreateEntry(sessionId)

    if (entry.status === 'running') {
      throw new Error('Session is busy')
    }

    // Check per-user concurrent limit
    const runningForUser = this.countRunningForUser(userId)
    if (runningForUser >= this.options.maxConcurrentPerUser) {
      throw new Error(`Too many concurrent sessions for user (limit: ${this.options.maxConcurrentPerUser})`)
    }

    entry.userId = userId
    entry.status = 'running'
    this.broadcast(entry, 'status', { status: 'running' })

    return this.runSend(entry, sessionPath, cwd, message)
  }

  private async runSend(
    entry: SessionEntry,
    sessionPath: string,
    cwd: string,
    message: string,
  ): Promise<void> {
    let timedOut = false
    const timeoutMs = this.options.promptTimeoutMs ?? 15 * 60 * 1000
    entry.timer = setTimeout(() => {
      timedOut = true
      entry.status = 'error'
      this.broadcast(entry, 'error', { code: 'timeout', message: 'Session prompt timed out' })
      this.broadcast(entry, 'status', { status: 'error' })
      entry.sdkSession?.abort().catch(() => {})
    }, timeoutMs)

    try {
      // Create SDK session if needed
      if (!entry.sdkSession) {
        entry.sdkSession = await this.options.createSession(sessionPath, cwd)
        entry.unsubscribe = entry.sdkSession.subscribe((event: unknown) => {
          this.broadcast(entry!, 'pi', event)
        })
      }

      await entry.sdkSession.prompt(message)
      if (timedOut || entry.status === 'error') {
        return
      }
      entry.status = 'idle'
      this.broadcast(entry, 'status', { status: 'idle' })
    } catch (err) {
      if (timedOut) {
        return
      }
      entry.status = 'error'
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.broadcast(entry, 'error', { code: 'PROMPT_ERROR', message: errorMsg })
      this.broadcast(entry, 'status', { status: 'error' })
    } finally {
      if (entry.timer) {
        clearTimeout(entry.timer)
        entry.timer = null
      }
      if (entry.unsubscribe) {
        entry.unsubscribe()
        entry.unsubscribe = null
      }
      if (entry.sdkSession) {
        entry.sdkSession.dispose()
        entry.sdkSession = null
      }
    }
  }

  async abort(sessionId: string): Promise<void> {
    const entry = this.entries.get(sessionId)
    if (!entry?.sdkSession) return
    await entry.sdkSession.abort()
  }

  getStatus(sessionId: string): SessionStatus {
    return this.entries.get(sessionId)?.status ?? 'idle'
  }

  subscribe(sessionId: string, handler: SSEClientHandler): () => void {
    const entry = this.getOrCreateEntry(sessionId)
    entry.sseClients.add(handler)
    return () => {
      entry.sseClients.delete(handler)
    }
  }

  getRingBuffer(sessionId: string): SSEEnvelope[] {
    return this.entries.get(sessionId)?.ringBuffer ?? []
  }

  getBufferSince(sessionId: string, lastSeq: number): SSEEnvelope[] {
    const buffer = this.getRingBuffer(sessionId)
    return buffer.filter(e => e.id > lastSeq)
  }

  dispose(): void {
    for (const [, entry] of this.entries) {
      if (entry.status === 'running' && entry.sdkSession) {
        entry.sdkSession.abort().catch(() => {})
        entry.status = 'idle'
        this.broadcast(entry, 'status', { status: 'idle' })
      }
      if (entry.timer) {
        clearTimeout(entry.timer)
        entry.timer = null
      }
      if (entry.unsubscribe) {
        entry.unsubscribe()
      }
      if (entry.sdkSession) {
        entry.sdkSession.dispose()
      }
    }
    this.entries.clear()
  }

  private broadcast(entry: SessionEntry, event: SSEEnvelope['event'], data: unknown): void {
    const envelope: SSEEnvelope = {
      event,
      data: JSON.stringify(data),
      id: ++entry.seq,
    }

    // Ring buffer
    entry.ringBuffer.push(envelope)
    if (entry.ringBuffer.length > this.options.ringBufferSize) {
      entry.ringBuffer.shift()
    }

    // Broadcast to SSE clients
    const failedHandlers: SSEClientHandler[] = []
    for (const handler of entry.sseClients) {
      try {
        handler(envelope)
      } catch {
        failedHandlers.push(handler)
      }
    }
    for (const handler of failedHandlers) {
      entry.sseClients.delete(handler)
    }
  }

  private countRunningForUser(userId: string): number {
    let count = 0
    for (const [, entry] of this.entries) {
      if (entry.userId === userId && entry.status === 'running') {
        count++
      }
    }
    return count
  }
}

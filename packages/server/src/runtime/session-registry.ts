import { logger } from '../logger.js'
export type SessionStatus = 'idle' | 'running' | 'error'

export type SSEEnvelope = {
  event: 'pi' | 'status' | 'error'
  data: string
  id: number
}

export type SSEClientHandler = (envelope: SSEEnvelope) => void

export type ImageContent = {
  type: 'image'
  data: string
  mimeType: string
}

export type SdkSession = {
  prompt: (text: string, images?: ImageContent[]) => Promise<void>
  setModel: (provider: string, modelId: string) => Promise<void>
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
    model?: { provider: string; modelId: string },
    images?: ImageContent[],
  ): Promise<void> {
    const entry = this.getOrCreateEntry(sessionId)

    if (entry.status === 'running') {
      logger.warn({ sessionId, userId }, 'session.send_rejected_busy')
      throw new Error('Session is busy')
    }

    // Check per-user concurrent limit
    const runningForUser = this.countRunningForUser(userId)
    if (runningForUser >= this.options.maxConcurrentPerUser) {
      logger.warn({
        sessionId,
        userId,
        runningForUser,
        limit: this.options.maxConcurrentPerUser,
      }, 'session.send_rejected_concurrent_limit')
      throw new Error(`Too many concurrent sessions for user (limit: ${this.options.maxConcurrentPerUser})`)
    }

    entry.userId = userId
    entry.status = 'running'
    logger.info({ sessionId, userId }, 'session.send_started')
    this.broadcast(entry, 'status', { status: 'running' })

    return this.runSend(entry, sessionId, sessionPath, cwd, message, model, images)
  }

  private async runSend(
    entry: SessionEntry,
    sessionId: string,
    sessionPath: string,
    cwd: string,
    message: string,
    model?: { provider: string; modelId: string },
    images?: ImageContent[],
  ): Promise<void> {
    const promptStartedAt = Date.now()
    let sdkEventCount = 0
    let firstSdkEventType: string | null = null
    let lastSdkEventType: string | null = null
    let progressTimer: ReturnType<typeof setInterval> | null = null

    let timedOut = false
    const timeoutMs = this.options.promptTimeoutMs ?? 15 * 60 * 1000
    entry.timer = setTimeout(() => {
      timedOut = true
      entry.status = 'error'
      this.broadcast(entry, 'error', { code: 'timeout', message: 'Session prompt timed out' })
      this.broadcast(entry, 'status', { status: 'error' })
      entry.sdkSession?.abort().catch(() => {})
      logger.error({ sessionId, sessionPath, cwd }, 'session.prompt_timeout')
    }, timeoutMs)

    try {
      // Create SDK session if needed
      if (!entry.sdkSession) {
        logger.info({
          sessionId,
          userId: entry.userId,
          sessionPath,
          cwd,
        }, 'session.create_agent_session_started')
        entry.sdkSession = await this.options.createSession(sessionPath, cwd)
        logger.info({
          sessionId,
          userId: entry.userId,
          sessionPath,
          cwd,
        }, 'session.create_agent_session_completed')
        entry.unsubscribe = entry.sdkSession.subscribe((event: unknown) => {
          sdkEventCount += 1
          const eventType =
            event && typeof event === 'object' && 'type' in event && typeof (event as { type?: unknown }).type === 'string'
              ? (event as { type: string }).type
              : 'unknown'
          lastSdkEventType = eventType
          if (!firstSdkEventType) {
            firstSdkEventType = eventType
            logger.info({
              sessionId,
              userId: entry.userId,
              eventType,
              elapsedMs: Date.now() - promptStartedAt,
            }, 'session.sdk_first_event_received')
          }
          if (eventType === 'message_end') {
            const payload = event as {
              message?: {
                stopReason?: string
                errorMessage?: string
                model?: string
                provider?: string
              }
            }
            logger.info({
              sessionId,
              userId: entry.userId,
              stopReason: payload.message?.stopReason ?? null,
              errorMessage: payload.message?.errorMessage ?? null,
              model: payload.message?.model ?? null,
              provider: payload.message?.provider ?? null,
            }, 'session.sdk_message_end')
          }
          this.broadcast(entry!, 'pi', event)
        })
      }

      if (model) {
        logger.info({
          sessionId,
          userId: entry.userId,
          provider: model.provider,
          modelId: model.modelId,
        }, 'session.set_model_started')
        await entry.sdkSession.setModel(model.provider, model.modelId)
        logger.info({
          sessionId,
          userId: entry.userId,
          provider: model.provider,
          modelId: model.modelId,
        }, 'session.set_model_completed')
      }

      logger.info({
        sessionId,
        userId: entry.userId,
        messageLength: message.length,
        imageCount: images?.length ?? 0,
      }, 'session.prompt_started')
      progressTimer = setInterval(() => {
        logger.info({
          sessionId,
          userId: entry.userId,
          elapsedMs: Date.now() - promptStartedAt,
          sdkEventCount,
          firstSdkEventType,
          lastSdkEventType,
        }, 'session.prompt_in_progress')
      }, 10_000)
      await entry.sdkSession.prompt(message, images)
      if (timedOut || entry.status === 'error') {
        return
      }
      logger.info({
        sessionId,
        userId: entry.userId,
        elapsedMs: Date.now() - promptStartedAt,
        sdkEventCount,
        firstSdkEventType,
        lastSdkEventType,
      }, 'session.prompt_completed')
      entry.status = 'idle'
      this.broadcast(entry, 'status', { status: 'idle' })
      logger.info({
        sessionId,
        userId: entry.userId,
        sessionPath,
        cwd,
        messageLength: message.length,
        imageCount: images?.length ?? 0,
      }, 'session.send_completed')
    } catch (err) {
      if (timedOut) {
        return
      }
      entry.status = 'error'
      const errorMsg = err instanceof Error ? err.message : String(err)
      logger.error({
        sessionId,
        userId: entry.userId,
        elapsedMs: Date.now() - promptStartedAt,
        sdkEventCount,
        firstSdkEventType,
        lastSdkEventType,
        errorMessage: errorMsg,
      }, 'session.prompt_failed')
      this.broadcast(entry, 'error', { code: 'PROMPT_ERROR', message: errorMsg })
      this.broadcast(entry, 'status', { status: 'error' })
      logger.error({
        sessionId,
        userId: entry.userId,
        sessionPath,
        cwd,
        err,
      }, 'session.send_failed')
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
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
    logger.info({ sessionId }, 'session.abort_called')
  }

  getStatus(sessionId: string): SessionStatus {
    return this.entries.get(sessionId)?.status ?? 'idle'
  }

  subscribe(sessionId: string, handler: SSEClientHandler): () => void {
    const entry = this.getOrCreateEntry(sessionId)
    entry.sseClients.add(handler)
    logger.debug({
      sessionId,
      clientCount: entry.sseClients.size,
    }, 'session.sse_subscribed')
    return () => {
      entry.sseClients.delete(handler)
      logger.debug({
        sessionId,
        clientCount: entry.sseClients.size,
      }, 'session.sse_unsubscribed')
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
    for (const [sessionId, entry] of this.entries) {
      if (entry.status === 'running' && entry.sdkSession) {
        entry.sdkSession.abort().catch(() => {})
        entry.status = 'idle'
        this.broadcast(entry, 'status', { status: 'idle' })
        logger.warn({ sessionId }, 'session.force_aborted_on_dispose')
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
    if (failedHandlers.length > 0) {
      logger.warn({
        removedCount: failedHandlers.length,
        remainingCount: entry.sseClients.size,
      }, 'session.sse_handler_removed')
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

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { SessionStore } from '../stores/session-store.js'
import type { SessionRegistry, ThinkingLevel } from '../runtime/session-registry.js'
import type { AttachmentStore } from '../stores/attachment-store.js'
import { resolveSessionPath, resolveWorkspacePath, ensureDirs } from '../runtime/path-resolver.js'
import { resolveFileIdsToImages, MAX_FILE_IDS_PER_SEND } from './files.js'
import { readFileSync } from 'node:fs'
import { logger } from '../logger.js'
import '../auth/types.js'

export function createRuntimeRoutes(
  sessionStore: SessionStore,
  registry: SessionRegistry,
  dataDir: string,
  attachmentStore?: AttachmentStore,
): Hono {
  const app = new Hono()

  function parseModelRef(raw: string | undefined): { provider: string; modelId: string } | undefined {
    if (!raw) return undefined
    const idx = raw.indexOf(':')
    if (idx <= 0 || idx === raw.length - 1) return undefined
    const provider = raw.slice(0, idx).trim()
    const modelId = raw.slice(idx + 1).trim()
    if (!provider || !modelId) return undefined
    return { provider, modelId }
  }

  function getOwnedSession(userId: string, sessionId: string) {
    return sessionStore.findById(sessionId, userId)
  }

  app.post('/api/sessions/:id/send', async (c) => {
    const userId = c.get('userId')
    const sessionId = c.req.param('id')
    const body = await c.req.json<{ message: string; model?: string; fileIds?: string[]; thinkingLevel?: string }>()

    if (!body.message || !body.message.trim()) {
      return c.json({ error: 'message is required' }, 400)
    }
    const model = parseModelRef(body.model)
    if (body.model !== undefined && !model) {
      return c.json({ error: 'model must be in provider:modelId format' }, 400)
    }

    // Validate fileIds
    const fileIds = body.fileIds ?? []
    if (fileIds.length > MAX_FILE_IDS_PER_SEND) {
      return c.json({ error: `Too many files: ${fileIds.length}. Max: ${MAX_FILE_IDS_PER_SEND}` }, 400)
    }

    const session = getOwnedSession(userId, sessionId)
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    // Resolve file attachments to ImageContent
    let images: { type: 'image'; data: string; mimeType: string }[] | undefined
    if (fileIds.length > 0 && attachmentStore) {
      try {
        images = await resolveFileIdsToImages(fileIds, userId, attachmentStore, dataDir)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return c.json({ error: msg }, 400)
      }
    }

    const sessionPath = resolveSessionPath(dataDir, userId, session.sessionDir)
    const workspacePath = resolveWorkspacePath(dataDir, userId, session.cwd)
    ensureDirs(sessionPath, workspacePath)

    try {
      // Fire and forget — client listens via SSE
      const validLevels: ThinkingLevel[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh']
      const thinkingLevel = body.thinkingLevel && validLevels.includes(body.thinkingLevel as ThinkingLevel)
        ? body.thinkingLevel as ThinkingLevel
        : undefined
      registry.send(sessionId, userId, sessionPath, workspacePath, body.message, model, images, thinkingLevel)
        .catch((err) => {
          logger.error({
            requestId: c.get('requestId'),
            sessionId,
            userId,
            err,
          }, 'runtime.send_async_failed')
        }) // errors are also broadcast via SSE
      return c.json({ ok: true }, 202)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('busy')) return c.json({ error: msg }, 409)
      if (msg.includes('concurrent')) return c.json({ error: msg }, 429)
      logger.error({
        requestId: c.get('requestId'),
        sessionId,
        userId,
        err,
      }, 'runtime.send_rejected')
      return c.json({ error: msg }, 500)
    }
  })

  app.get('/api/sessions/:id/events', (c) => {
    const userId = c.get('userId')
    const sessionId = c.req.param('id')

    const session = getOwnedSession(userId, sessionId)
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    const lastEventId = c.req.header('Last-Event-ID')
    const parsedSeq = lastEventId ? parseInt(lastEventId, 10) : 0
    const lastSeq = Number.isFinite(parsedSeq) ? parsedSeq : 0

    return streamSSE(c, async (stream) => {
      // Replay from ring buffer
      const missed = registry.getBufferSince(sessionId, lastSeq)
      for (const envelope of missed) {
        await stream.writeSSE({
          event: envelope.event,
          data: envelope.data,
          id: String(envelope.id),
        })
      }

      // Subscribe to live events
      const unsubscribe = registry.subscribe(sessionId, (envelope) => {
        stream.writeSSE({
          event: envelope.event,
          data: envelope.data,
          id: String(envelope.id),
        }).catch(() => {})
      })

      // Keep connection alive
      stream.onAbort(() => {
        unsubscribe()
      })

      // Keep stream open until client disconnects
      await new Promise<void>((resolve) => {
        stream.onAbort(resolve)
      })
    })
  })

  app.post('/api/sessions/:id/abort', async (c) => {
    const userId = c.get('userId')
    const sessionId = c.req.param('id')

    const session = getOwnedSession(userId, sessionId)
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    await registry.abort(sessionId)
    return c.json({ ok: true })
  })

  app.get('/api/sessions/:id/status', (c) => {
    const userId = c.get('userId')
    const sessionId = c.req.param('id')

    const session = getOwnedSession(userId, sessionId)
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    return c.json({ status: registry.getStatus(sessionId) })
  })

  app.get('/api/sessions/:id/history', (c) => {
    const userId = c.get('userId')
    const sessionId = c.req.param('id')

    const session = getOwnedSession(userId, sessionId)
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    const sessionPath = resolveSessionPath(dataDir, userId, session.sessionDir)

    try {
      const content = readFileSync(sessionPath, 'utf-8')
      const entries = content
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .filter((entry: { type?: string; message?: { role?: string } }) =>
          entry.message?.role === 'user' ||
          entry.message?.role === 'assistant' ||
          entry.type === 'toolResult'
        )
      return c.json({ messages: entries })
    } catch {
      logger.warn({
        requestId: c.get('requestId'),
        sessionId,
        userId,
      }, 'runtime.history_read_failed')
      return c.json({ messages: [] })
    }
  })

  return app
}

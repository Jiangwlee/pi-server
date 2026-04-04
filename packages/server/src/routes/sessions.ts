import { Hono } from 'hono'
import type { SessionStore } from '../stores/session-store.js'
import type { SessionRegistry } from '../runtime/session-registry.js'
import { validateRelativePath } from '../runtime/path-resolver.js'
import '../auth/types.js'

export function createSessionRoutes(
  sessionStore: SessionStore,
  registry: SessionRegistry,
): Hono {
  const app = new Hono()

  app.get('/api/sessions', (c) => {
    const userId = c.get('userId')
    const sessions = sessionStore.listByUser(userId)
    return c.json(sessions)
  })

  app.post('/api/sessions', async (c) => {
    const userId = c.get('userId')
    const body = await c.req.json<{
      cwd?: string
      sessionDir?: string
      session_dir?: string
      label?: string
    }>()

    try {
      const cwd = body.cwd !== undefined ? validateRelativePath(body.cwd) : undefined
      const sessionDirInput = body.sessionDir ?? body.session_dir
      const sessionDir = sessionDirInput !== undefined ? validateRelativePath(sessionDirInput) : undefined
      const session = sessionStore.createSession(userId, { cwd, sessionDir, label: body.label })
      return c.json(session, 201)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 400)
    }
  })

  app.patch('/api/sessions/:id', async (c) => {
    const userId = c.get('userId')
    const sessionId = c.req.param('id')
    const body = await c.req.json<{ label: string }>()
    const updated = sessionStore.updateLabel(sessionId, userId, body.label)
    if (!updated) {
      return c.json({ error: 'Session not found' }, 404)
    }
    return c.json({ ok: true })
  })

  app.delete('/api/sessions/:id', (c) => {
    const userId = c.get('userId')
    const sessionId = c.req.param('id')

    // Check if session is running
    const status = registry.getStatus(sessionId)
    if (status === 'running') {
      return c.json({ error: 'Cannot delete a running session' }, 409)
    }

    const deleted = sessionStore.softDelete(sessionId, userId)
    if (!deleted) {
      return c.json({ error: 'Session not found' }, 404)
    }
    return c.json({ ok: true })
  })

  return app
}

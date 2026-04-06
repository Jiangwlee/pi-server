import { Hono } from 'hono'
import type { SessionStore } from '../stores/session-store.js'
import type { FeedbackStore } from '../stores/feedback-store.js'
import '../auth/types.js'

export function createFeedbackRoutes(
  sessionStore: SessionStore,
  feedbackStore: FeedbackStore,
): Hono {
  const app = new Hono()

  // POST /api/sessions/:sessionId/messages/:messageId/feedback
  app.post('/api/sessions/:sessionId/messages/:messageId/feedback', async (c) => {
    const userId = c.get('userId')
    const { sessionId, messageId } = c.req.param()

    const session = sessionStore.findById(sessionId, userId)
    if (!session) return c.json({ error: 'Session not found' }, 404)

    const body = await c.req.json<{ is_positive: boolean; feedback_text?: string }>()
    if (typeof body.is_positive !== 'boolean') {
      return c.json({ error: 'is_positive is required' }, 400)
    }

    const feedback = feedbackStore.upsert(
      messageId,
      sessionId,
      userId,
      body.is_positive,
      body.feedback_text,
    )
    return c.json(feedback, 200)
  })

  // DELETE /api/sessions/:sessionId/messages/:messageId/feedback
  app.delete('/api/sessions/:sessionId/messages/:messageId/feedback', (c) => {
    const userId = c.get('userId')
    const { sessionId, messageId } = c.req.param()

    const session = sessionStore.findById(sessionId, userId)
    if (!session) return c.json({ error: 'Session not found' }, 404)

    const deleted = feedbackStore.delete(messageId, userId)
    if (!deleted) return c.json({ error: 'Feedback not found' }, 404)
    return c.json({ ok: true })
  })

  return app
}

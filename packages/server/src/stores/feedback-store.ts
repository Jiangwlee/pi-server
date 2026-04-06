import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { logger } from '../logger.js'

export interface MessageFeedback {
  id: string
  messageId: string
  sessionId: string
  userId: string
  isPositive: boolean
  feedbackText: string | null
  createdAt: string
}

export class FeedbackStore {
  constructor(private db: Database.Database) {}

  upsert(
    messageId: string,
    sessionId: string,
    userId: string,
    isPositive: boolean,
    feedbackText?: string,
  ): MessageFeedback {
    const existing = this.findByMessageAndUser(messageId, userId)

    if (existing) {
      this.db.prepare(`
        UPDATE message_feedback
        SET is_positive = ?, feedback_text = ?
        WHERE message_id = ? AND user_id = ?
      `).run(isPositive ? 1 : 0, feedbackText ?? null, messageId, userId)
      logger.info({ messageId, userId, isPositive }, 'feedback.updated')
      return this.findByMessageAndUser(messageId, userId)!
    }

    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO message_feedback (id, message_id, session_id, user_id, is_positive, feedback_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, messageId, sessionId, userId, isPositive ? 1 : 0, feedbackText ?? null)
    logger.info({ messageId, userId, isPositive }, 'feedback.created')
    return this.findByMessageAndUser(messageId, userId)!
  }

  delete(messageId: string, userId: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM message_feedback WHERE message_id = ? AND user_id = ?'
    ).run(messageId, userId)
    if (result.changes > 0) {
      logger.info({ messageId, userId }, 'feedback.deleted')
    }
    return result.changes > 0
  }

  findByMessageAndUser(messageId: string, userId: string): MessageFeedback | null {
    const row = this.db.prepare(
      'SELECT * FROM message_feedback WHERE message_id = ? AND user_id = ?'
    ).get(messageId, userId) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  listBySession(sessionId: string): MessageFeedback[] {
    const rows = this.db.prepare(
      'SELECT * FROM message_feedback WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as Record<string, unknown>[]
    return rows.map(r => this.mapRow(r))
  }

  private mapRow(row: Record<string, unknown>): MessageFeedback {
    return {
      id: row.id as string,
      messageId: row.message_id as string,
      sessionId: row.session_id as string,
      userId: row.user_id as string,
      isPositive: (row.is_positive as number) === 1,
      feedbackText: row.feedback_text as string | null,
      createdAt: row.created_at as string,
    }
  }
}

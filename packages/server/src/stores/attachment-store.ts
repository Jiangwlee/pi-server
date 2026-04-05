import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { logger } from '../logger.js'

export interface Attachment {
  id: string
  userId: string
  sessionId: string
  fileName: string
  mimeType: string
  size: number
  extractedText: string | null
  referencedAt: number | null
  createdAt: number
}

export interface CreateAttachmentInput {
  userId: string
  sessionId: string
  fileName: string
  mimeType: string
  size: number
}

export class AttachmentStore {
  constructor(private db: Database.Database) {}

  create(input: CreateAttachmentInput): Attachment {
    const id = `file-${randomUUID()}`
    const createdAt = Date.now()

    this.db.prepare(`
      INSERT INTO attachments (id, user_id, session_id, file_name, mime_type, size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.userId, input.sessionId, input.fileName, input.mimeType, input.size, createdAt)

    logger.info({ attachmentId: id, userId: input.userId, sessionId: input.sessionId }, 'store.attachment_created')
    return this.findByIdInternal(id)!
  }

  findById(id: string): Attachment | null {
    const row = this.db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  findByIdAndUser(id: string, userId: string): Attachment | null {
    const row = this.db.prepare(
      'SELECT * FROM attachments WHERE id = ? AND user_id = ?',
    ).get(id, userId) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  listBySession(sessionId: string, userId: string): Attachment[] {
    const rows = this.db.prepare(
      'SELECT * FROM attachments WHERE session_id = ? AND user_id = ? ORDER BY created_at DESC',
    ).all(sessionId, userId) as Record<string, unknown>[]
    return rows.map(r => this.mapRow(r))
  }

  markReferenced(ids: string[]): void {
    if (ids.length === 0) return
    const now = Date.now()
    const placeholders = ids.map(() => '?').join(', ')
    this.db.prepare(
      `UPDATE attachments SET referenced_at = ? WHERE id IN (${placeholders}) AND referenced_at IS NULL`,
    ).run(now, ...ids)
  }

  findOrphans(olderThanMs: number): Attachment[] {
    const cutoff = Date.now() - olderThanMs
    const rows = this.db.prepare(
      'SELECT * FROM attachments WHERE referenced_at IS NULL AND created_at < ?',
    ).all(cutoff) as Record<string, unknown>[]
    return rows.map(r => this.mapRow(r))
  }

  deleteBySession(sessionId: string): number {
    const result = this.db.prepare('DELETE FROM attachments WHERE session_id = ?').run(sessionId)
    if (result.changes > 0) {
      logger.info({ sessionId, count: result.changes }, 'store.attachments_deleted_by_session')
    }
    return result.changes
  }

  deleteById(id: string): boolean {
    const result = this.db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
    if (result.changes > 0) {
      logger.info({ attachmentId: id }, 'store.attachment_deleted')
    }
    return result.changes > 0
  }

  private findByIdInternal(id: string): Attachment | null {
    const row = this.db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  private mapRow(row: Record<string, unknown>): Attachment {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      sessionId: row.session_id as string,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string,
      size: row.size as number,
      extractedText: row.extracted_text as string | null,
      referencedAt: row.referenced_at as number | null,
      createdAt: row.created_at as number,
    }
  }
}

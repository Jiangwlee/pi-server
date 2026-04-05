import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { logger } from '../logger.js'

export interface Session {
  id: string
  userId: string
  cwd: string
  sessionDir: string
  label: string | null
  createdAt: string
  deletedAt: string | null
}

interface CreateSessionInput {
  cwd?: string
  sessionDir?: string
  label?: string
}

export class SessionStore {
  constructor(private db: Database.Database) {}

  createSession(userId: string, input: CreateSessionInput): Session {
    const id = randomUUID()
    const cwd = input.cwd || 'default/'
    const cwdNormalized = cwd.endsWith('/') ? cwd : `${cwd}/`
    const sessionDir = input.sessionDir || `${cwdNormalized}${id}/`

    this.db.prepare(`
      INSERT INTO sessions (id, user_id, cwd, session_dir, label)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, cwd, sessionDir, input.label ?? null)

    logger.info({ sessionId: id, userId, label: input.label ?? null }, 'store.session_created')
    return this.findByIdInternal(id)!
  }

  listByUser(userId: string): Session[] {
    const rows = this.db.prepare(
      'SELECT * FROM sessions WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    ).all(userId) as Record<string, unknown>[]
    return rows.map(r => this.mapRow(r))
  }

  findById(sessionId: string, userId: string): Session | null {
    const row = this.db.prepare(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    ).get(sessionId, userId) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  softDelete(sessionId: string, userId: string): boolean {
    const result = this.db.prepare(
      "UPDATE sessions SET deleted_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    ).run(sessionId, userId)
    if (result.changes > 0) {
      logger.info({ sessionId, userId }, 'store.session_deleted')
    }
    return result.changes > 0
  }

  updateLabel(sessionId: string, userId: string, label: string): boolean {
    const result = this.db.prepare(
      'UPDATE sessions SET label = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    ).run(label, sessionId, userId)
    return result.changes > 0
  }

  private findByIdInternal(sessionId: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  private mapRow(row: Record<string, unknown>): Session {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      cwd: row.cwd as string,
      sessionDir: row.session_dir as string,
      label: row.label as string | null,
      createdAt: row.created_at as string,
      deletedAt: row.deleted_at as string | null,
    }
  }
}

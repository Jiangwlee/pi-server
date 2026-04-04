import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'

export interface User {
  id: string
  email: string | null
  authProvider: string
  authProviderId: string
  displayName: string
  passwordHash: string | null
  createdAt: string
}

interface CreateUserInput {
  email?: string
  authProvider: string
  authProviderId: string
  displayName: string
  passwordHash?: string
}

export class UserStore {
  constructor(private db: Database.Database) {}

  createUser(input: CreateUserInput): User {
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO users (id, email, auth_provider, auth_provider_id, display_name, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.email ?? null, input.authProvider, input.authProviderId, input.displayName, input.passwordHash ?? null)

    return this.findById(id)!
  }

  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  findByEmail(email: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ? AND auth_provider = ?').get(email, 'email') as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  findByProviderId(provider: string, providerId: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE auth_provider = ? AND auth_provider_id = ?').get(provider, providerId) as Record<string, unknown> | undefined
    return row ? this.mapRow(row) : null
  }

  updatePasswordHash(id: string, passwordHash: string): boolean {
    const result = this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
    return result.changes > 0
  }

  listAll(): User[] {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at').all() as Record<string, unknown>[]
    return rows.map(r => this.mapRow(r))
  }

  private mapRow(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      email: row.email as string | null,
      authProvider: row.auth_provider as string,
      authProviderId: row.auth_provider_id as string,
      displayName: row.display_name as string,
      passwordHash: row.password_hash as string | null,
      createdAt: row.created_at as string,
    }
  }
}

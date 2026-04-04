import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../src/db.js'
import { UserStore } from '../src/stores/user-store.js'
import { SessionStore } from '../src/stores/session-store.js'
import type Database from 'better-sqlite3'

describe('SessionStore', () => {
  let db: Database.Database
  let userStore: UserStore
  let sessionStore: SessionStore
  let userAId: string
  let userBId: string

  beforeEach(() => {
    db = initDb(':memory:')
    userStore = new UserStore(db)
    sessionStore = new SessionStore(db)

    const userA = userStore.createUser({
      email: 'a@test.com',
      authProvider: 'email',
      authProviderId: 'a@test.com',
      displayName: 'User A',
      passwordHash: 'hash_a',
    })
    const userB = userStore.createUser({
      email: 'b@test.com',
      authProvider: 'email',
      authProviderId: 'b@test.com',
      displayName: 'User B',
      passwordHash: 'hash_b',
    })
    userAId = userA.id
    userBId = userB.id
  })

  it('should create a session and retrieve it', () => {
    const session = sessionStore.createSession(userAId, {
      cwd: 'my-project',
      sessionDir: 'my-project/sess1',
      label: 'Test Session',
    })

    expect(session.id).toBeDefined()
    expect(session.userId).toBe(userAId)
    expect(session.cwd).toBe('my-project')
    expect(session.sessionDir).toBe('my-project/sess1')
    expect(session.label).toBe('Test Session')

    const list = sessionStore.listByUser(userAId)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(session.id)
  })

  it('should soft delete a session so it no longer appears in list', () => {
    const session = sessionStore.createSession(userAId, {})
    sessionStore.softDelete(session.id, userAId)

    const list = sessionStore.listByUser(userAId)
    expect(list).toHaveLength(0)
  })

  it('should not allow user A to see user B sessions', () => {
    sessionStore.createSession(userBId, { label: 'B session' })

    const listA = sessionStore.listByUser(userAId)
    expect(listA).toHaveLength(0)

    const listB = sessionStore.listByUser(userBId)
    expect(listB).toHaveLength(1)
  })

  it('should not allow user A to find user B session by id', () => {
    const session = sessionStore.createSession(userBId, {})
    const found = sessionStore.findById(session.id, userAId)
    expect(found).toBeNull()
  })

  it('should generate default paths when not provided', () => {
    const session = sessionStore.createSession(userAId, {})

    expect(session.cwd).toBe('default/')
    expect(session.sessionDir).toMatch(/^default\/[a-z0-9-]+\/$/)
  })

  it('should generate sessionDir from cwd + id when only cwd is provided', () => {
    const session = sessionStore.createSession(userAId, { cwd: 'my-project' })

    expect(session.cwd).toBe('my-project')
    expect(session.sessionDir).toMatch(/^my-project\/[a-z0-9-]+\/$/)
  })

  it('should update session label', () => {
    const session = sessionStore.createSession(userAId, { label: 'Old' })
    const updated = sessionStore.updateLabel(session.id, userAId, 'New')
    expect(updated).toBe(true)

    const found = sessionStore.findById(session.id, userAId)
    expect(found?.label).toBe('New')
  })

  it('should not update label for other user session', () => {
    const session = sessionStore.createSession(userBId, { label: 'B' })
    const updated = sessionStore.updateLabel(session.id, userAId, 'Hacked')
    expect(updated).toBe(false)
  })
})

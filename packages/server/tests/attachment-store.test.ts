import { beforeEach, describe, expect, it } from 'vitest'
import { initDb } from '../src/db.js'
import { UserStore } from '../src/stores/user-store.js'
import { SessionStore } from '../src/stores/session-store.js'
import { AttachmentStore } from '../src/stores/attachment-store.js'
import { initLogger } from '../src/logger.js'

initLogger('error', 'json')

describe('AttachmentStore', () => {
  let attachmentStore: AttachmentStore
  let userId: string
  let sessionId: string
  let sessionId2: string

  beforeEach(() => {
    const db = initDb(':memory:')
    const userStore = new UserStore(db)
    const sessionStore = new SessionStore(db)
    attachmentStore = new AttachmentStore(db)

    const user = userStore.createUser({
      email: 'test@test.com',
      authProvider: 'email',
      authProviderId: 'test@test.com',
      displayName: 'test',
      passwordHash: 'hash',
    })
    userId = user.id

    const session = sessionStore.createSession(userId, { label: 'A' })
    sessionId = session.id

    const session2 = sessionStore.createSession(userId, { label: 'B' })
    sessionId2 = session2.id
  })

  it('create returns attachment with file- prefix id', () => {
    const att = attachmentStore.create({
      userId,
      sessionId,
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    })

    expect(att.id).toMatch(/^file-/)
    expect(att.userId).toBe(userId)
    expect(att.sessionId).toBe(sessionId)
    expect(att.fileName).toBe('photo.jpg')
    expect(att.mimeType).toBe('image/jpeg')
    expect(att.size).toBe(1024)
    expect(att.referencedAt).toBeNull()
    expect(att.extractedText).toBeNull()
    expect(att.createdAt).toBeGreaterThan(0)
  })

  it('findById returns the attachment', () => {
    const att = attachmentStore.create({
      userId,
      sessionId,
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    })

    const found = attachmentStore.findById(att.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(att.id)
  })

  it('findByIdAndUser returns null for wrong userId', () => {
    const att = attachmentStore.create({
      userId,
      sessionId,
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    })

    expect(attachmentStore.findByIdAndUser(att.id, userId)).not.toBeNull()
    expect(attachmentStore.findByIdAndUser(att.id, 'wrong-user')).toBeNull()
  })

  it('listBySession returns only that session\'s attachments', () => {
    attachmentStore.create({ userId, sessionId, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 100 })
    attachmentStore.create({ userId, sessionId, fileName: 'b.jpg', mimeType: 'image/jpeg', size: 200 })
    attachmentStore.create({ userId, sessionId: sessionId2, fileName: 'c.jpg', mimeType: 'image/jpeg', size: 300 })

    const list = attachmentStore.listBySession(sessionId, userId)
    expect(list).toHaveLength(2)
    expect(list.every(a => a.sessionId === sessionId)).toBe(true)
  })

  it('markReferenced sets referenced_at', () => {
    const att = attachmentStore.create({ userId, sessionId, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 100 })
    expect(attachmentStore.findById(att.id)!.referencedAt).toBeNull()

    attachmentStore.markReferenced([att.id])

    const updated = attachmentStore.findById(att.id)!
    expect(updated.referencedAt).toBeGreaterThan(0)
  })

  it('markReferenced does not overwrite existing referenced_at', () => {
    const att = attachmentStore.create({ userId, sessionId, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 100 })
    attachmentStore.markReferenced([att.id])
    const firstRef = attachmentStore.findById(att.id)!.referencedAt!

    // Second call should not change the value
    attachmentStore.markReferenced([att.id])
    const secondRef = attachmentStore.findById(att.id)!.referencedAt!
    expect(secondRef).toBe(firstRef)
  })

  it('findOrphans returns unreferenced old attachments', () => {
    const att = attachmentStore.create({ userId, sessionId, fileName: 'old.jpg', mimeType: 'image/jpeg', size: 100 })

    // Just created — should NOT be an orphan with 1h threshold
    expect(attachmentStore.findOrphans(3600_000)).toHaveLength(0)

    // With -1ms threshold (cutoff in the future) — everything unreferenced is an orphan
    const orphans = attachmentStore.findOrphans(-1)
    expect(orphans).toHaveLength(1)
    expect(orphans[0].id).toBe(att.id)
  })

  it('findOrphans excludes referenced attachments', () => {
    const att = attachmentStore.create({ userId, sessionId, fileName: 'ref.jpg', mimeType: 'image/jpeg', size: 100 })
    attachmentStore.markReferenced([att.id])

    expect(attachmentStore.findOrphans(-1)).toHaveLength(0)
  })

  it('deleteBySession removes all session attachments', () => {
    attachmentStore.create({ userId, sessionId, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 100 })
    attachmentStore.create({ userId, sessionId, fileName: 'b.jpg', mimeType: 'image/jpeg', size: 200 })
    attachmentStore.create({ userId, sessionId: sessionId2, fileName: 'c.jpg', mimeType: 'image/jpeg', size: 300 })

    const count = attachmentStore.deleteBySession(sessionId)
    expect(count).toBe(2)
    expect(attachmentStore.listBySession(sessionId, userId)).toHaveLength(0)
    expect(attachmentStore.listBySession(sessionId2, userId)).toHaveLength(1)
  })

  it('deleteById removes single attachment', () => {
    const att = attachmentStore.create({ userId, sessionId, fileName: 'a.jpg', mimeType: 'image/jpeg', size: 100 })

    expect(attachmentStore.deleteById(att.id)).toBe(true)
    expect(attachmentStore.findById(att.id)).toBeNull()
    expect(attachmentStore.deleteById(att.id)).toBe(false)
  })
})

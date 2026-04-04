import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'cookie-signature'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { initDb } from '../src/db.js'
import { UserStore } from '../src/stores/user-store.js'
import { SessionStore, type Session } from '../src/stores/session-store.js'
import { authMiddleware } from '../src/auth/middleware.js'
import { createRuntimeRoutes } from '../src/routes/runtime.js'
import { SessionRegistry, type SdkSession } from '../src/runtime/session-registry.js'
import { createLogger } from '../src/logger.js'

const SECRET = 'x'.repeat(32)
const logger = createLogger('error', 'json')

function createHangingSession(): SdkSession {
  return {
    prompt: vi.fn().mockImplementation(() => new Promise<void>(() => {})),
    abort: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockImplementation(() => () => {}),
    dispose: vi.fn(),
  }
}

describe('runtime routes /api/sessions/:id/send', () => {
  let app: Hono
  let registry: SessionRegistry
  let sessionStore: SessionStore
  let dataDir: string
  let userId: string
  let cookie: string
  let sessionA: Session
  let sessionB: Session

  beforeEach(() => {
    const db = initDb(':memory:')
    const userStore = new UserStore(db)
    sessionStore = new SessionStore(db)
    dataDir = mkdtempSync(join(tmpdir(), 'pi-server-test-'))

    const user = userStore.createUser({
      email: 'runtime@test.com',
      authProvider: 'email',
      authProviderId: 'runtime@test.com',
      displayName: 'runtime',
      passwordHash: 'hash',
    })
    userId = user.id

    sessionA = sessionStore.createSession(userId, {
      cwd: 'proj-a',
      sessionDir: 'proj-a/sess-a',
      label: 'A',
    })
    sessionB = sessionStore.createSession(userId, {
      cwd: 'proj-b',
      sessionDir: 'proj-b/sess-b',
      label: 'B',
    })

    registry = new SessionRegistry({
      createSession: vi.fn().mockResolvedValue(createHangingSession()),
      ringBufferSize: 200,
      maxConcurrentPerUser: 1,
    })

    app = new Hono()
    app.use('/api/*', authMiddleware(SECRET))
    app.route('/', createRuntimeRoutes(sessionStore, registry, dataDir, logger))

    const signed = `s:${sign(userId, SECRET)}`
    cookie = `pi_session=${encodeURIComponent(signed)}`
  })

  afterEach(() => {
    registry.dispose()
    rmSync(dataDir, { recursive: true, force: true })
  })

  it('returns 409 when target session is already running', async () => {
    registry.send(sessionA.id, userId, '/tmp/sess-a.jsonl', '/tmp/ws-a', 'first')

    const res = await app.request(`/api/sessions/${sessionA.id}/send`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'again' }),
    })

    expect(res.status).toBe(409)
  })

  it('returns 429 when per-user concurrent limit is exceeded', async () => {
    registry.send(sessionA.id, userId, '/tmp/sess-a.jsonl', '/tmp/ws-a', 'first')

    const res = await app.request(`/api/sessions/${sessionB.id}/send`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'second' }),
    })

    expect(res.status).toBe(429)
  })

  it('returns 202 when send is accepted', async () => {
    registry = new SessionRegistry({
      createSession: vi.fn().mockResolvedValue({
        prompt: vi.fn().mockResolvedValue(undefined),
        abort: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockImplementation(() => () => {}),
        dispose: vi.fn(),
      }),
      ringBufferSize: 200,
      maxConcurrentPerUser: 3,
    })

    app = new Hono()
    app.use('/api/*', authMiddleware(SECRET))
    app.route('/', createRuntimeRoutes(sessionStore, registry, dataDir, logger))

    const res = await app.request(`/api/sessions/${sessionA.id}/send`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'hello' }),
    })

    expect(res.status).toBe(202)
  })
})

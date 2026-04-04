import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, setAuthCookie, clearAuthCookie } from '../src/auth/middleware.js'
import { sign } from 'cookie-signature'
import bcrypt from 'bcrypt'
import { initDb } from '../src/db.js'
import { UserStore } from '../src/stores/user-store.js'
import { createEmailProtectedAuthRoutes, createEmailPublicAuthRoutes } from '../src/auth/email.js'

describe('authMiddleware', () => {
  const SECRET = 'a'.repeat(32)
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.use('/api/*', authMiddleware(SECRET))
    app.get('/api/me', (c) => {
      return c.json({ userId: c.get('userId') })
    })
    // Auth routes should be unprotected
    app.get('/auth/test', (c) => c.json({ ok: true }))
  })

  it('should return 401 when no cookie is present', async () => {
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
  })

  it('should return 401 for invalid signed cookie', async () => {
    const res = await app.request('/api/me', {
      headers: { Cookie: 'pi_session=invalid_value' },
    })
    expect(res.status).toBe(401)
  })

  it('should extract userId from valid signed cookie', async () => {
    const signed = `s:${sign('user-abc', SECRET)}`
    const res = await app.request('/api/me', {
      headers: { Cookie: `pi_session=${encodeURIComponent(signed)}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('user-abc')
  })

  it('should set and clear auth cookie', async () => {
    const testApp = new Hono()
    testApp.get('/set', (c) => {
      setAuthCookie(c, 'user-123', SECRET)
      return c.json({ ok: true })
    })
    testApp.get('/clear', (c) => {
      clearAuthCookie(c)
      return c.json({ ok: true })
    })

    const setRes = await testApp.request('/set')
    const setCookie = setRes.headers.get('set-cookie')
    expect(setCookie).toContain('pi_session=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Max-Age=604800')

    const clearRes = await testApp.request('/clear')
    const clearCookie = clearRes.headers.get('set-cookie')
    expect(clearCookie).toContain('pi_session=')
    expect(clearCookie).toContain('Max-Age=0')
  })
})

describe('email auth routes', () => {
  const SECRET = 'b'.repeat(32)
  let app: Hono
  let userStore: UserStore
  let email = 'user@test.com'
  let password = 'secret123'

  beforeEach(async () => {
    const db = initDb(':memory:')
    userStore = new UserStore(db)
    const hash = await bcrypt.hash(password, 10)
    userStore.createUser({
      email,
      authProvider: 'email',
      authProviderId: email,
      displayName: 'tester',
      passwordHash: hash,
    })

    app = new Hono()
    app.route('/', createEmailPublicAuthRoutes(userStore, SECRET))
    app.use('/auth/*', authMiddleware(SECRET))
    app.route('/', createEmailProtectedAuthRoutes(userStore))
  })

  it('should return current user with /auth/me', async () => {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const cookie = loginRes.headers.get('set-cookie')!

    const meRes = await app.request('/auth/me', {
      headers: { Cookie: cookie },
    })
    expect(meRes.status).toBe(200)
    const body = await meRes.json()
    expect(body.email).toBe(email)
    expect(body.authProvider).toBe('email')
  })

  it('should clear auth cookie with /auth/logout', async () => {
    const signed = `s:${sign('user-abc', SECRET)}`
    const res = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `pi_session=${encodeURIComponent(signed)}` },
    })
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('pi_session=')
    expect(setCookie).toContain('Max-Age=0')
  })

  it('should change password when authenticated', async () => {
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const cookie = loginRes.headers.get('set-cookie')!

    const changeRes = await app.request('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ oldPassword: password, newPassword: 'new-secret' }),
    })
    expect(changeRes.status).toBe(200)

    const relogin = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'new-secret' }),
    })
    expect(relogin.status).toBe(200)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, setAuthCookie, clearAuthCookie } from '../src/auth/middleware.js'
import { sign } from 'cookie-signature'

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

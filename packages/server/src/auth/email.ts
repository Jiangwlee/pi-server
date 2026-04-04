import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import type { UserStore } from '../stores/user-store.js'
import { clearAuthCookie, setAuthCookie } from './middleware.js'

export function createEmailPublicAuthRoutes(
  userStore: UserStore,
  sessionSecret: string,
): Hono {
  const app = new Hono()

  app.post('/auth/login', async (c) => {
    const body = await c.req.json<{ email: string; password: string }>()
    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const user = userStore.findByEmail(body.email)
    if (!user || !user.passwordHash) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    setAuthCookie(c, user.id, sessionSecret)
    return c.json({ id: user.id, displayName: user.displayName, email: user.email })
  })

  return app
}

export function createEmailProtectedAuthRoutes(
  userStore: UserStore,
): Hono {
  const app = new Hono()

  app.post('/auth/change-password', async (c) => {
    const userId = c.get('userId')
    const user = userStore.findById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    if (user.authProvider !== 'email') {
      return c.json({ error: 'Password change is only available for email auth users' }, 400)
    }

    const body = await c.req.json<{ oldPassword: string; newPassword: string }>()
    if (!body.oldPassword || !body.newPassword) {
      return c.json({ error: 'Old and new password are required' }, 400)
    }

    const valid = await bcrypt.compare(body.oldPassword, user.passwordHash!)
    if (!valid) {
      return c.json({ error: 'Invalid old password' }, 401)
    }

    const newHash = await bcrypt.hash(body.newPassword, 10)
    userStore.updatePasswordHash(user.id, newHash)
    return c.json({ ok: true })
  })

  app.get('/auth/me', (c) => {
    const userId = c.get('userId')
    const user = userStore.findById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    return c.json({
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
      displayName: user.displayName,
    })
  })

  app.post('/auth/logout', (c) => {
    clearAuthCookie(c)
    return c.json({ ok: true })
  })

  return app
}

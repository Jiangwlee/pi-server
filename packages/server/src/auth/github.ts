import { Hono } from 'hono'
import { GitHub } from 'arctic'
import { randomBytes } from 'node:crypto'
import type { UserStore } from '../stores/user-store.js'
import { logger } from '../logger.js'
import { setAuthCookie } from './middleware.js'

const STATE_COOKIE = 'oauth_state'
const STATE_MAX_AGE = 600 // 10 minutes

export function createGithubAuthRoutes(
  clientId: string,
  clientSecret: string,
  callbackUrl: string,
  userStore: UserStore,
  sessionSecret: string,
  frontendUrl: string,
): Hono {
  const app = new Hono()
  const github = new GitHub(clientId, clientSecret, callbackUrl)

  app.get('/auth/github', (c) => {
    const state = randomBytes(16).toString('hex')
    const url = github.createAuthorizationURL(state, ['user:email'])
    logger.info('auth.github_oauth_initiated')
    c.header('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${STATE_MAX_AGE}`)
    return c.redirect(url.toString())
  })

  app.get('/auth/github/callback', async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')

    if (!code || !state) {
      logger.warn({ reason: 'missing_code_or_state' }, 'auth.github_callback_invalid')
      return c.json({ error: 'Missing code or state' }, 400)
    }

    // Validate state against cookie
    const cookieHeader = c.req.header('cookie') ?? ''
    const stateCookie = cookieHeader
      .split(';')
      .map(s => s.trim().split('='))
      .find(([k]) => k === STATE_COOKIE)?.[1]

    if (!stateCookie || stateCookie !== state) {
      logger.warn({ reason: 'state_mismatch' }, 'auth.github_callback_invalid')
      return c.json({ error: 'Invalid state parameter' }, 400)
    }

    try {
      // Exchange code for token
      const tokens = await github.validateAuthorizationCode(code)
      const accessToken = tokens.accessToken()

      // Fetch user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'pi-server' },
      })
      if (!userRes.ok) {
        logger.error({ endpoint: '/user', status: userRes.status }, 'auth.github_api_failed')
        return c.json({ error: 'Failed to fetch GitHub profile' }, 502)
      }
      const profile = await userRes.json() as { id: number; login: string; email: string | null }

      // Fetch email if not public
      let email = profile.email
      if (!email) {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'pi-server' },
        })
        if (emailRes.ok) {
          const emails = await emailRes.json() as Array<{ email: string; primary: boolean }>
          email = emails.find(e => e.primary)?.email ?? null
        }
      }

      // Upsert user
      let user = userStore.findByProviderId('github', String(profile.id))
      const isNewUser = !user
      if (!user) {
        user = userStore.createUser({
          email: email ?? undefined,
          authProvider: 'github',
          authProviderId: String(profile.id),
          displayName: profile.login,
        })
      }

      logger.info({
        userId: user.id,
        githubLogin: profile.login,
        isNewUser,
      }, 'auth.github_login_succeeded')

      // Clear state cookie, set auth cookie
      c.header('Set-Cookie', `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
      setAuthCookie(c, user.id, sessionSecret)
      return c.redirect(frontendUrl)
    } catch (err) {
      logger.error({ err }, 'auth.github_callback_failed')
      return c.json({ error: 'OAuth callback failed' }, 500)
    }
  })

  return app
}

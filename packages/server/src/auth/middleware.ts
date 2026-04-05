import type { Context, MiddlewareHandler } from 'hono'
import { sign, unsign } from 'cookie-signature'
import { logger } from '../logger.js'
import './types.js'

const COOKIE_NAME = 'pi_session'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of header.split(';')) {
    const [name, ...rest] = pair.trim().split('=')
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='))
    }
  }
  return cookies
}

export function authMiddleware(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const cookieHeader = c.req.header('cookie')
    if (!cookieHeader) {
      logger.debug({ reason: 'no_cookie', path: c.req.path }, 'auth.rejected')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const cookies = parseCookies(cookieHeader)
    const raw = cookies[COOKIE_NAME]
    if (!raw || !raw.startsWith('s:')) {
      logger.debug({ reason: 'invalid_cookie_format', path: c.req.path }, 'auth.rejected')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const unsigned = unsign(raw.slice(2), secret)
    if (unsigned === false) {
      logger.warn({ reason: 'signature_invalid', path: c.req.path }, 'auth.rejected')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    c.set('userId', unsigned)
    await next()
  }
}

export function setAuthCookie(c: Context, userId: string, secret: string): void {
  const signed = `s:${sign(userId, secret)}`
  c.header('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(signed)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`)
}

export function clearAuthCookie(c: Context): void {
  c.header('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
}

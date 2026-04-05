import type { MiddlewareHandler } from 'hono'
import { logger } from '../logger.js'

interface RequestLoggerOptions {
  includeUserId?: boolean
}

export function createRequestLoggerMiddleware(
  options: RequestLoggerOptions = {},
): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.get('requestId')
    const start = Date.now()

    try {
      await next()
      logger.info({
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Date.now() - start,
        ...(options.includeUserId ? { userId: c.get('userId') } : {}),
      }, 'http_request')
    } catch (err) {
      logger.error({
        requestId,
        method: c.req.method,
        path: c.req.path,
        durationMs: Date.now() - start,
        ...(options.includeUserId ? { userId: c.get('userId') } : {}),
        err,
      }, 'http_request_failed')
      throw err
    }
  }
}

import type { MiddlewareHandler } from 'hono'
import type { Logger } from '../logger.js'
import { withError } from '../logger.js'

interface RequestLoggerOptions {
  includeUserId?: boolean
}

export function createRequestLoggerMiddleware(
  logger: Logger,
  options: RequestLoggerOptions = {},
): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.get('requestId')
    const start = Date.now()

    try {
      await next()
      logger.info('http_request', {
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Date.now() - start,
        ...(options.includeUserId ? { userId: c.get('userId') } : {}),
      })
    } catch (err) {
      logger.error('http_request_failed', withError({
        requestId,
        method: c.req.method,
        path: c.req.path,
        durationMs: Date.now() - start,
        ...(options.includeUserId ? { userId: c.get('userId') } : {}),
      }, err))
      throw err
    }
  }
}

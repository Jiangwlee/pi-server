import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'

import { loadConfig } from './config.js'
import { initDb } from './db.js'
import { UserStore } from './stores/user-store.js'
import { SessionStore } from './stores/session-store.js'
import { authMiddleware } from './auth/middleware.js'
import { createEmailProtectedAuthRoutes, createEmailPublicAuthRoutes } from './auth/email.js'
import { createGithubAuthRoutes } from './auth/github.js'
import { PiProvider } from './runtime/pi-provider.js'
import { SessionRegistry } from './runtime/session-registry.js'
import { createSessionRoutes } from './routes/sessions.js'
import { createRuntimeRoutes } from './routes/runtime.js'
import { createModelRoutes } from './routes/models.js'
import { createLogger, withError } from './logger.js'
import { createRequestLoggerMiddleware } from './http/request-logger.js'

import {
  createAgentSession,
  createCodingTools,
  SessionManager,
} from '@mariozechner/pi-coding-agent'

const config = loadConfig()
const logger = createLogger(config.logLevel, config.logFormat)

// Auth Server mode: minimal server that only serves auth.json
if (config.authServer) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    const requestId = randomUUID()
    c.set('requestId', requestId)
    c.header('x-request-id', requestId)
    await next()
  })
  app.use('*', createRequestLoggerMiddleware(logger))

  app.get('/auth.json', (c) => {
    const token = c.req.header('Authorization')
    if (!token || token !== `Bearer ${config.authServerToken}`) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const authPath = join(homedir(), '.pi', 'agent', 'auth.json')
      const data = JSON.parse(readFileSync(authPath, 'utf-8'))
      return c.json(data)
    } catch {
      return c.json({ error: 'auth.json not found' }, 500)
    }
  })

  const server = serve({ fetch: app.fetch, port: config.port })
  logger.info('server.auth_mode_started', { port: config.port })

  process.on('SIGTERM', () => server.close())
  process.on('SIGINT', () => server.close())
} else {
  // Normal mode
  const app = new Hono()

  // Initialize DB
  const dbPath = join(config.dataDir, 'pi-server.db')
  const db = initDb(dbPath)
  const userStore = new UserStore(db)
  const sessionStore = new SessionStore(db)

  // Initialize Pi Provider
  const piProvider = new PiProvider({
    authProxyUrl: config.authProxyUrl,
    authProxyToken: config.authProxyToken,
    logger,
  })

  // Session Registry with real SDK factory
  const registry = new SessionRegistry({
    createSession: async (sessionPath: string, cwd: string) => {
      const authStorage = piProvider.getAuthStorage()
      const modelRegistry = piProvider.getModelRegistry()
      const tools = createCodingTools(cwd)
      const { session } = await createAgentSession({
        cwd,
        modelRegistry,
        tools,
        sessionManager: SessionManager.open(sessionPath),
      })
      return session
    },
    ringBufferSize: config.sseRingBufferSize,
    maxConcurrentPerUser: config.maxConcurrentSessionsPerUser,
    promptTimeoutMs: 15 * 60 * 1000,
    logger,
  })

  // Middleware
  app.use('*', cors())
  app.use('*', bodyLimit({ maxSize: config.bodyLimit }))
  app.use('*', async (c, next) => {
    const requestId = randomUUID()
    c.set('requestId', requestId)
    c.header('x-request-id', requestId)
    await next()
  })
  app.use('*', createRequestLoggerMiddleware(logger, { includeUserId: true }))

  // Auth routes (public)
  app.route('/', createEmailPublicAuthRoutes(userStore, config.sessionSecret))
  if (config.githubClientId && config.githubClientSecret) {
    const callbackUrl = `${config.publicServerUrl}/auth/github/callback`
    app.route('/', createGithubAuthRoutes(
      config.githubClientId,
      config.githubClientSecret,
      callbackUrl,
      userStore,
      config.sessionSecret,
      config.frontendUrl,
    ))
  }

  // Auth routes (protected)
  app.use('/auth/*', authMiddleware(config.sessionSecret))
  app.route('/', createEmailProtectedAuthRoutes(userStore))

  // Auth middleware for API routes
  app.use('/api/*', authMiddleware(config.sessionSecret))

  // API routes
  app.route('/', createSessionRoutes(sessionStore, registry))
  app.route('/', createRuntimeRoutes(sessionStore, registry, config.dataDir, logger))
  app.route('/', createModelRoutes(piProvider))

  // Startup
  async function start() {
    // Fail-closed: auth-proxy first pull must succeed
    await piProvider.init()

    const server = serve({ fetch: app.fetch, port: config.port })
    logger.info('server.started', { port: config.port })

    const shutdown = () => {
      logger.info('server.shutting_down')
      registry.dispose()
      piProvider.dispose()
      db.close()
      server.close()
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  }

  start().catch((err) => {
    logger.error('server.failed_to_start', withError({}, err))
    process.exit(1)
  })
}

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { loadConfig } from './config.js'
import { readAuthConfig } from './auth/auth-config.js'
import { initDb } from './db.js'
import { UserStore } from './stores/user-store.js'
import { SessionStore } from './stores/session-store.js'
import { AttachmentStore } from './stores/attachment-store.js'
import { authMiddleware } from './auth/middleware.js'
import { createEmailProtectedAuthRoutes, createEmailPublicAuthRoutes } from './auth/email.js'
import { createGithubAuthRoutes } from './auth/github.js'
import { PiProvider } from './runtime/pi-provider.js'
import { SessionRegistry, type ImageContent } from './runtime/session-registry.js'
import { createSessionRoutes } from './routes/sessions.js'
import { createRuntimeRoutes } from './routes/runtime.js'
import { createFileRoutes } from './routes/files.js'
import { createModelRoutes } from './routes/models.js'
import { createFeedbackRoutes } from './routes/feedback.js'
import { FeedbackStore } from './stores/feedback-store.js'
import { initLogger, logger } from './logger.js'
import { createRequestLoggerMiddleware } from './http/request-logger.js'

import {
  createAgentSession,
  createCodingTools,
  SessionManager,
} from '@mariozechner/pi-coding-agent'

const config = loadConfig()
initLogger(config.logLevel, config.logFormat)

// Auth Server mode: minimal server that only serves auth.json
if (config.authServer) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    const requestId = randomUUID()
    c.set('requestId', requestId)
    c.header('x-request-id', requestId)
    await next()
  })
  app.use('*', createRequestLoggerMiddleware())

  app.get('/auth', (c) => {
    const token = c.req.header('Authorization')
    if (!token || token !== `Bearer ${config.authServerToken}`) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const data = readAuthConfig()
      return c.json(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read auth config'
      return c.json({ error: message }, 500)
    }
  })

  const server = serve({ fetch: app.fetch, port: config.port })
  logger.info({ port: config.port }, 'server.auth_mode_started')

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
  const attachmentStore = new AttachmentStore(db)
  const feedbackStore = new FeedbackStore(db)

  // Initialize Pi Provider
  const piProvider = new PiProvider({
    authProxyUrl: config.authProxyUrl,
    authProxyToken: config.authProxyToken,
  })

  // Session Registry with real SDK factory
  const registry = new SessionRegistry({
    createSession: async (sessionPath: string, cwd: string) => {
      logger.info({ sessionPath, cwd }, 'sdk.create_agent_session_started')
      const authStorage = piProvider.getAuthStorage()
      const modelRegistry = piProvider.getModelRegistry()
      const tools = createCodingTools(cwd)
      const { session } = await createAgentSession({
        cwd,
        modelRegistry,
        tools,
        sessionManager: SessionManager.open(sessionPath),
      })
      logger.info({ sessionPath, cwd }, 'sdk.create_agent_session_completed')
      return {
        prompt: (text: string, images?: ImageContent[]) => session.prompt(text, images ? { images } : undefined),
        setModel: async (provider: string, modelId: string) => {
          const model = modelRegistry.find(provider, modelId)
          if (!model) {
            throw new Error(`Model not found: ${provider}:${modelId}`)
          }
          await session.setModel(model)
        },
        setThinkingLevel: (level) => session.setThinkingLevel(level),
        abort: () => session.abort(),
        subscribe: (listener: (event: unknown) => void) => session.subscribe(listener),
        dispose: () => session.dispose(),
      }
    },
    ringBufferSize: config.sseRingBufferSize,
    maxConcurrentPerUser: config.maxConcurrentSessionsPerUser,
    promptTimeoutMs: 15 * 60 * 1000,
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
  app.use('*', createRequestLoggerMiddleware({ includeUserId: true }))

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
  app.route('/', createRuntimeRoutes(sessionStore, registry, config.dataDir, attachmentStore))
  app.route('/', createFileRoutes(attachmentStore, sessionStore, config.dataDir))
  app.route('/', createModelRoutes(piProvider))
  app.route('/', createFeedbackRoutes(sessionStore, feedbackStore))

  // Startup
  async function start() {
    // Fail-closed: auth-proxy first pull must succeed
    await piProvider.init()

    const server = serve({ fetch: app.fetch, port: config.port })
    logger.info({ port: config.port }, 'server.started')

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
    logger.error({ err }, 'server.failed_to_start')
    process.exit(1)
  })
}

import type { LogFormat, LogLevel } from './logger.js'
import { parseLogFormat, parseLogLevel } from './logger.js'

export interface Config {
  port: number
  dataDir: string
  sessionSecret: string
  publicServerUrl: string
  frontendUrl: string
  githubClientId?: string
  githubClientSecret?: string
  sseRingBufferSize: number
  maxConcurrentSessionsPerUser: number
  authServer: boolean
  authServerToken?: string
  authProxyUrl?: string
  authProxyToken?: string
  bodyLimit: number
  logLevel: LogLevel
  logFormat: LogFormat
}

export function loadConfig(argv: string[] = process.argv.slice(2)): Config {
  const env = process.env

  const authServer = argv.includes('--auth-server')
  const authProxyIdx = argv.indexOf('--auth-proxy-url')
  const authProxyUrl = authProxyIdx !== -1 ? argv[authProxyIdx + 1] : env.AUTH_PROXY_URL
  const authProxyTokenIdx = argv.indexOf('--auth-proxy-token')
  const authProxyToken = authProxyTokenIdx !== -1 ? argv[authProxyTokenIdx + 1] : env.AUTH_PROXY_TOKEN

  if (authServer && authProxyUrl) {
    throw new Error('--auth-server and --auth-proxy-url are mutually exclusive')
  }

  const port = parseInt(env.PORT ?? '3000', 10)

  if (authServer) {
    const authServerToken = env.AUTH_SERVER_TOKEN
    if (!authServerToken) {
      throw new Error('AUTH_SERVER_TOKEN is required in auth-server mode')
    }
    return {
      port,
      dataDir: '',
      sessionSecret: '',
      publicServerUrl: '',
      frontendUrl: '',
      authServer: true,
      authServerToken,
      sseRingBufferSize: 0,
      maxConcurrentSessionsPerUser: 0,
      bodyLimit: 0,
      logLevel: 'info',
      logFormat: 'json',
    }
  }

  const sessionSecret = env.SESSION_SECRET ?? ''
  if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
    throw new Error('SESSION_SECRET is required and must be at least 32 bytes')
  }

  const dataDir = env.PI_SERVER_DATA ?? './data'
  const publicServerUrl = env.PUBLIC_SERVER_URL ?? `http://localhost:${port}`
  const frontendUrl = env.FRONTEND_URL ?? `http://localhost:3100`

  return {
    port,
    dataDir,
    sessionSecret,
    publicServerUrl,
    frontendUrl,
    githubClientId: env.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET,
    sseRingBufferSize: parseInt(env.SSE_RING_BUFFER_SIZE ?? '200', 10),
    maxConcurrentSessionsPerUser: parseInt(env.MAX_CONCURRENT_SESSIONS_PER_USER ?? '3', 10),
    authServer: false,
    authServerToken: env.AUTH_SERVER_TOKEN,
    authProxyUrl,
    authProxyToken,
    bodyLimit: 1024 * 1024, // 1MB
    logLevel: parseLogLevel(env.LOG_LEVEL),
    logFormat: parseLogFormat(env.LOG_FORMAT),
  }
}

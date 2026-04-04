export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogFormat = 'json' | 'plain'

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface Logger {
  debug: (message: string, fields?: Record<string, unknown>) => void
  info: (message: string, fields?: Record<string, unknown>) => void
  warn: (message: string, fields?: Record<string, unknown>) => void
  error: (message: string, fields?: Record<string, unknown>) => void
}

function sanitizeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    }
  }
  return { value: String(err) }
}

export function createLogger(level: LogLevel, format: LogFormat): Logger {
  function shouldLog(target: LogLevel): boolean {
    return LEVEL_WEIGHT[target] >= LEVEL_WEIGHT[level]
  }

  function write(target: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (!shouldLog(target)) return

    const payload = {
      ts: new Date().toISOString(),
      level: target,
      msg: message,
      ...(fields ?? {}),
    }

    if (format === 'json') {
      const line = JSON.stringify(payload)
      if (target === 'error') console.error(line)
      else if (target === 'warn') console.warn(line)
      else console.log(line)
      return
    }

    const kv = fields
      ? Object.entries(fields).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' ')
      : ''
    const line = `[${payload.ts}] [${target}] ${message}${kv ? ` ${kv}` : ''}`
    if (target === 'error') console.error(line)
    else if (target === 'warn') console.warn(line)
    else console.log(line)
  }

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  }
}

export function parseLogLevel(input: string | undefined): LogLevel {
  if (input === 'debug' || input === 'info' || input === 'warn' || input === 'error') {
    return input
  }
  return 'info'
}

export function parseLogFormat(input: string | undefined): LogFormat {
  if (input === 'json' || input === 'plain') {
    return input
  }
  return 'json'
}

export function withError(fields: Record<string, unknown>, error: unknown): Record<string, unknown> {
  return { ...fields, error: sanitizeError(error) }
}

import pino from 'pino'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogFormat = 'json' | 'plain'

let _logger: pino.Logger = pino({ level: 'silent' })

export type Logger = pino.Logger

/**
 * Initialize the singleton logger. Must be called before first use.
 * Subsequent calls reconfigure the logger in place.
 */
export function initLogger(level: LogLevel, format: LogFormat): void {
  let transport: pino.TransportSingleOptions | undefined
  if (format === 'plain') {
    try {
      require.resolve('pino-pretty')
      transport = { target: 'pino-pretty', options: { colorize: true } }
    } catch {
      // pino-pretty not installed (production) — fall back to JSON
    }
  }

  _logger = pino({ level, transport })
}

/** The singleton logger. Import this in any module. */
export const logger: Logger = new Proxy({} as pino.Logger, {
  get(_target, prop, receiver) {
    return Reflect.get(_logger, prop, receiver)
  },
  has(_target, prop) {
    return prop in _logger
  },
})

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

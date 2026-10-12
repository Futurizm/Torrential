const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

type Level = 'debug' | 'info' | 'warn' | 'error'

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const THRESHOLD: number = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? ORDER.info

function paint(color: keyof typeof COLORS, text: string): string {
  if (process.env.NO_COLOR) return text
  return `${COLORS[color]}${text}${COLORS.reset}`
}

function emit(level: Level, scope: string, args: unknown[]): void {
  if (ORDER[level] < THRESHOLD) return
  const time = new Date().toISOString().slice(11, 19)
  const tag = paint(level === 'error' ? 'red' : level === 'warn' ? 'yellow' : 'gray', level.toUpperCase().padEnd(5))
  const prefix = `${paint('gray', time)} ${tag} ${paint('cyan', `[${scope}]`)}`
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  sink(prefix, ...args)
}

export interface Logger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

export function createLogger(scope: string): Logger {
  return {
    debug: (...args) => emit('debug', scope, args),
    info: (...args) => emit('info', scope, args),
    warn: (...args) => emit('warn', scope, args),
    error: (...args) => emit('error', scope, args),
  }
}

export const log = createLogger('torrential')
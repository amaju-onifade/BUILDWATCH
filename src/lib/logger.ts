/**
 * Structured JSON Logger for BuildWatch.
 * Consistent logging levels and metadata for easy observability.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  env: string
  module?: string
  userId?: string
  projectId?: string
  requestId?: string
  error?: {
    message: string
    stack?: string
    code?: string
  }
  [key: string]: unknown
}

function formatLog(level: LogLevel, message: string, meta: Record<string, any> = {}): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    ...meta,
  }
}

export function log(level: LogLevel, message: string, meta: Record<string, any> = {}): void {
  const entry = formatLog(level, message, meta)

  if (process.env.NODE_ENV === 'production') {
    // In production, write single-line JSON to stdout for log aggregators
    process.stdout.write(JSON.stringify(entry) + '\n')
  } else {
    // In development, pretty-print for better DX
    const color = 
      level === 'error' ? '\x1b[31m' : 
      level === 'warn' ? '\x1b[33m' : 
      level === 'info' ? '\x1b[32m' : '\x1b[36m'
    const reset = '\x1b[0m'
    
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `${color}[${level.toUpperCase()}]${reset} ${message}`,
      Object.keys(meta).length ? meta : ''
    )
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, any>) => log('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, any>) => log('info', msg, meta),
  warn:  (msg: string, meta?: Record<string, any>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, any>) => log('error', msg, meta),
}

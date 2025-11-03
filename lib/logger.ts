/**
 * Logger utility for consistent logging across the application
 * Ensures logs are visible in Vercel's logging system
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  requestId?: string
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  // Use crypto.randomUUID if available (Node.js 19.0.0+), otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: use crypto.randomBytes for secure random generation
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    const randomStr = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 9)
    return `${Date.now()}-${randomStr}`
  }
  // Last resort: should not happen in modern environments
  throw new Error('Secure random number generation is not available')
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any, requestId?: string): string {
    const timestamp = new Date().toISOString()
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
      ...(requestId && { requestId }),
    }
    return JSON.stringify(logEntry)
  }

  /**
   * Log info messages
   */
  info(message: string, data?: any, requestId?: string): void {
    const formatted = this.formatMessage('info', message, data, requestId)
    console.log(formatted)
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: any, requestId?: string): void {
    const formatted = this.formatMessage('warn', message, data, requestId)
    console.warn(formatted)
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error | any, requestId?: string): void {
    const errorData = error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : error

    const formatted = this.formatMessage('error', message, errorData, requestId)
    console.error(formatted)
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: any, requestId?: string): void {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, data, requestId)
      console.debug(formatted)
    }
  }

  /**
   * Log HTTP request
   */
  request(method: string, path: string, statusCode?: number, duration?: number, requestId?: string): void {
    const message = `[${method}] ${path}${statusCode ? ` ${statusCode}` : ''}${duration ? ` ${duration}ms` : ''}`
    this.info(message, { method, path, statusCode, duration }, requestId)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for convenience
export default logger


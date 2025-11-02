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
  // Fallback for older Node.js versions
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
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


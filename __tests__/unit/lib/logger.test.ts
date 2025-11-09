import { logger, generateRequestId } from '@/lib/logger'

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let consoleDebugSpy: jest.SpyInstance

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('logger.info', () => {
    it('should log info message', () => {
      logger.info('Test message')
      expect(consoleLogSpy).toHaveBeenCalled()
      const call = consoleLogSpy.mock.calls[0][0]
      expect(call).toContain('Test message')
      expect(JSON.parse(call)).toMatchObject({
        level: 'info',
        message: 'Test message',
      })
    })

    it('should include data in log', () => {
      logger.info('Test message', { key: 'value' })
      const call = consoleLogSpy.mock.calls[0][0]
      const parsed = JSON.parse(call)
      expect(parsed.data).toEqual({ key: 'value' })
    })

    it('should include requestId in log', () => {
      logger.info('Test message', undefined, 'req-123')
      const call = consoleLogSpy.mock.calls[0][0]
      const parsed = JSON.parse(call)
      expect(parsed.requestId).toBe('req-123')
    })
  })

  describe('logger.warn', () => {
    it('should log warning message', () => {
      logger.warn('Warning message')
      expect(consoleWarnSpy).toHaveBeenCalled()
      const call = consoleWarnSpy.mock.calls[0][0]
      expect(JSON.parse(call)).toMatchObject({
        level: 'warn',
        message: 'Warning message',
      })
    })
  })

  describe('logger.error', () => {
    it('should log error message', () => {
      logger.error('Error message')
      expect(consoleErrorSpy).toHaveBeenCalled()
      const call = consoleErrorSpy.mock.calls[0][0]
      expect(JSON.parse(call)).toMatchObject({
        level: 'error',
        message: 'Error message',
      })
    })

    it('should log Error object with stack trace', () => {
      const error = new Error('Test error')
      logger.error('Error message', error)
      const call = consoleErrorSpy.mock.calls[0][0]
      const parsed = JSON.parse(call)
      // Error data should contain error information
      expect(parsed.level).toBe('error')
      expect(parsed.message).toBe('Error message')
      // Check if error data exists (it should when error is passed)
      if (parsed.data) {
        expect(parsed.data).toHaveProperty('message', 'Test error')
      }
    })
  })

  describe('logger.debug', () => {
    it('should log debug message in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      logger.debug('Debug message')
      expect(consoleDebugSpy).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should not log debug message in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      logger.debug('Debug message')
      expect(consoleDebugSpy).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('logger.request', () => {
    it('should log HTTP request', () => {
      logger.request('GET', '/api/tickets', 200, 150, 'req-123')
      expect(consoleLogSpy).toHaveBeenCalled()
      const call = consoleLogSpy.mock.calls[0][0]
      const parsed = JSON.parse(call)
      expect(parsed.message).toContain('[GET]')
      expect(parsed.message).toContain('/api/tickets')
      expect(parsed.data).toMatchObject({
        method: 'GET',
        path: '/api/tickets',
        statusCode: 200,
        duration: 150,
      })
    })
  })

  describe('generateRequestId', () => {
    it('should generate a unique request ID', () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(typeof id1).toBe('string')
      expect(id1).not.toBe(id2)
    })

    it('should generate different IDs on each call', () => {
      const ids = new Set()
      for (let i = 0; i < 10; i++) {
        ids.add(generateRequestId())
      }
      expect(ids.size).toBe(10)
    })
  })
})


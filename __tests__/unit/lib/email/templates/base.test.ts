import {
  getEmailConfig,
  setEmailConfig,
  getCurrentEmailConfig,
  createBaseEmailHTML,
  createCTAButton,
  createParagraph,
  createHeading,
} from '@/lib/email/templates/base'

describe('email/templates/base', () => {
  beforeEach(() => {
    // Reset config
    setEmailConfig(getEmailConfig())
  })

  describe('getEmailConfig', () => {
    it('should return default email config', () => {
      const config = getEmailConfig()

      expect(config.appName).toBe('Repair Assistant')
      expect(config.primaryColor).toBe('#FFD700')
      expect(config.secondaryColor).toBe('#000000')
      expect(config.grayColor).toBe('#666666')
      expect(config.emailFrom).toBeDefined()
      expect(config.baseUrl).toBeDefined()
    })

    it('should use environment variables when available', () => {
      const originalEnv = process.env
      process.env.EMAIL_FROM = 'test@example.com'
      process.env.NEXTAUTH_URL = 'https://example.com'

      const config = getEmailConfig()

      expect(config.emailFrom).toBe('test@example.com')
      expect(config.baseUrl).toBe('https://example.com')

      process.env = originalEnv
    })
  })

  describe('setEmailConfig and getCurrentEmailConfig', () => {
    it('should set and retrieve custom config', () => {
      const customConfig = {
        appName: 'Custom App',
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        grayColor: '#CCCCCC',
        emailFrom: 'custom@example.com',
        baseUrl: 'https://custom.com',
      }

      setEmailConfig(customConfig)
      const retrieved = getCurrentEmailConfig()

      expect(retrieved).toEqual(customConfig)
    })

    it('should fallback to default when no custom config set', () => {
      setEmailConfig(getEmailConfig())
      const config = getCurrentEmailConfig()

      expect(config.appName).toBe('Repair Assistant')
    })
  })

  describe('createBaseEmailHTML', () => {
    it('should create HTML email structure', () => {
      const config = getEmailConfig()
      const html = createBaseEmailHTML(config, '<p>Test content</p>')

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html')
      expect(html).toContain('Test content')
    })

    it('should include app name in HTML', () => {
      const config = getEmailConfig()
      const html = createBaseEmailHTML(config, '<p>Test</p>')

      expect(html).toContain('Repair Assistant')
    })
  })

  describe('createCTAButton', () => {
    it('should create button with URL and text', () => {
      const config = getEmailConfig()
      const button = createCTAButton('https://example.com', 'Click Here', config)

      expect(button).toContain('https://example.com')
      expect(button).toContain('Click Here')
      expect(button).toContain('<a')
    })
  })

  describe('createParagraph', () => {
    it('should create paragraph element', () => {
      const config = getEmailConfig()
      const paragraph = createParagraph('Test text', config)

      expect(paragraph).toContain('<p')
      expect(paragraph).toContain('Test text')
    })

    it('should apply custom styles', () => {
      const config = getEmailConfig()
      const paragraph = createParagraph('Test', config, { margin: '10px', fontSize: '16px' })

      expect(paragraph).toContain('margin: 10px')
      expect(paragraph).toContain('font-size: 16px')
    })
  })

  describe('createHeading', () => {
    it('should create heading element', () => {
      const config = getEmailConfig()
      const heading = createHeading('Test Heading', 2, config)

      expect(heading).toContain('<h2')
      expect(heading).toContain('Test Heading')
    })

    it('should support different heading levels', () => {
      const config = getEmailConfig()
      const h1 = createHeading('Title', 1, config)
      const h3 = createHeading('Subtitle', 3, config)

      expect(h1).toContain('<h1')
      expect(h3).toContain('<h3')
    })
  })
})


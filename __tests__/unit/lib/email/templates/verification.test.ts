import { verificationEmailTemplate, VerificationEmailData } from '@/lib/email/templates/verification'
import { getEmailConfig, setEmailConfig } from '@/lib/email/templates/base'

describe('verificationEmailTemplate', () => {
  beforeEach(() => {
    setEmailConfig(getEmailConfig())
  })

  it('should generate subject with app name', () => {
    const data: VerificationEmailData = {
      verificationUrl: 'https://example.com/verify?token=123',
    }

    const subject = verificationEmailTemplate.subject(data)

    expect(subject).toContain('Verify your email address')
    expect(subject).toContain('Repair Assistant')
  })

  it('should generate HTML email with verification URL', () => {
    const data: VerificationEmailData = {
      verificationUrl: 'https://example.com/verify?token=123',
      userName: 'John Doe',
    }

    const html = verificationEmailTemplate.html(data)

    expect(html).toContain('https://example.com/verify?token=123')
    expect(html).toContain('Verify Email Address')
    expect(html).toContain('John Doe')
  })

  it('should generate HTML without user name', () => {
    const data: VerificationEmailData = {
      verificationUrl: 'https://example.com/verify?token=123',
    }

    const html = verificationEmailTemplate.html(data)

    expect(html).toContain('Hi there,')
    expect(html).not.toContain('Hi undefined,')
  })

  it('should generate text email', () => {
    const data: VerificationEmailData = {
      verificationUrl: 'https://example.com/verify?token=123',
      userName: 'John Doe',
    }

    const text = verificationEmailTemplate.text(data)

    expect(text).toContain('https://example.com/verify?token=123')
    expect(text).toContain('verify your email address')
  })
})


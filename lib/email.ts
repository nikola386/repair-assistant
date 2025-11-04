import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { EmailTemplate, EmailTemplateData, getEmailConfig } from './email/templates/base'
import { verificationEmailTemplate } from './email/templates/verification'

/**
 * Email service for sending emails with reusable templates
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private config = getEmailConfig()

  constructor() {
    // Initialize transporter based on environment variables
    const emailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST
    const emailPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER
    const emailPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD

    // If email configuration is not provided, log warning
    if (!emailHost || !emailUser || !emailPassword) {
      console.warn('Email configuration not found. Email functionality will be limited.')
      // For development, you can use Ethereal Email (https://ethereal.email)
      // or configure SMTP settings in your .env file
      return
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(emailPort, 10),
      secure: emailPort === '465',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    })
  }

  /**
   * Generate a secure verification token
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Send email using a template
   */
  async sendEmail(
    to: string,
    template: EmailTemplate,
    data: EmailTemplateData
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service is not configured. Please set SMTP environment variables.')
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.config.appName}" <${this.config.emailFrom}>`,
        to,
        subject: template.subject(data),
        html: template.html(data),
        text: template.text(data),
      })
    } catch (error) {
      console.error('Error sending email:', error)
      throw new Error('Failed to send email')
    }
  }

  /**
   * Send verification email (convenience method)
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    userName?: string | null
  ): Promise<void> {
    const verificationUrl = `${this.config.baseUrl}/verify-email?token=${verificationToken}`
    
    await this.sendEmail(email, verificationEmailTemplate, {
      userName,
      verificationUrl,
    })
  }

  /**
   * Verify email transporter is configured
   */
  isConfigured(): boolean {
    return this.transporter !== null
  }
}

export const emailService = new EmailService()

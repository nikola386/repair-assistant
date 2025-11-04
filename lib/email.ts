import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { EmailTemplate, EmailTemplateData, getEmailConfig, setEmailConfig, EmailConfig } from './email/templates/base'
import { verificationEmailTemplate } from './email/templates/verification'
import { settingsStorage } from './settingsStorage'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from './constants'

/**
 * Email service for sending emails with reusable templates
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private defaultConfig = getEmailConfig()
  private testAccount: nodemailer.TestAccount | null = null
  private initializationPromise: Promise<void> | null = null

  constructor() {
    // Start initialization but don't await it here
    this.initializationPromise = this.initialize()
  }

  /**
   * Initialize email transporter
   */
  private async initialize(): Promise<void> {
    // Initialize transporter based on environment variables
    const emailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST
    const emailPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER
    const emailPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD

    // If email configuration is not provided, create a test account
    if (!emailHost || !emailUser || !emailPassword) {
      console.warn('Email configuration not found. Creating Ethereal Email test account for development...')
      try {
        this.testAccount = await nodemailer.createTestAccount()
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: this.testAccount.user,
            pass: this.testAccount.pass,
          },
        })

        console.log('✅ Ethereal Email test account created successfully!')
        console.log(`📧 Test account: ${this.testAccount.user}`)
        console.log(`🔗 View emails at: https://ethereal.email`)
        console.log(`📋 Credentials: user=${this.testAccount.user}, pass=${this.testAccount.pass}`)
      } catch (error) {
        console.error('❌ Failed to create test email account:', error)
        console.warn('⚠️  Email functionality will be disabled. Configure SMTP settings in your .env file.')
        this.transporter = null
      }
      return
    }

    // Use real SMTP configuration
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
   * Ensure transporter is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise
      this.initializationPromise = null
    }
  }

  /**
   * Get email config with store-specific colors if storeId is provided
   */
  private async getEmailConfigForStore(storeId?: string): Promise<EmailConfig> {
    if (!storeId) {
      return this.defaultConfig
    }

    try {
      const settings = await settingsStorage.findByStoreId(storeId)
      if (settings) {
        return {
          ...this.defaultConfig,
          primaryColor: settings.primaryColor || DEFAULT_PRIMARY_COLOR,
          secondaryColor: settings.secondaryColor || DEFAULT_SECONDARY_COLOR,
        }
      }
    } catch (error) {
      console.error('Error fetching store settings for email:', error)
      // Fall back to default config if there's an error
    }

    return this.defaultConfig
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
    data: EmailTemplateData,
    storeId?: string
  ): Promise<void> {
    await this.ensureInitialized()

    if (!this.transporter) {
      throw new Error('Email service is not configured. Please set SMTP environment variables.')
    }

    // Get store-specific config if storeId is provided
    const config = await this.getEmailConfigForStore(storeId)
    
    // Set the config for templates to use
    setEmailConfig(config)

    try {
      const info = await this.transporter.sendMail({
        from: `"${config.appName}" <${this.testAccount?.user || config.emailFrom}>`,
        to,
        subject: template.subject(data),
        html: template.html(data),
        text: template.text(data),
      })

      // If using test account, log the preview URL
      if (this.testAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info)
        if (previewUrl) {
          console.log(`📧 Test email sent! Preview: ${previewUrl}`)
        }
      }
    } catch (error) {
      console.error('Error sending email:', error)
      throw new Error('Failed to send email')
    } finally {
      // Reset to default config after sending
      setEmailConfig(this.defaultConfig)
    }
  }

  /**
   * Send verification email (convenience method)
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    userName?: string | null,
    storeId?: string
  ): Promise<void> {
    const config = await this.getEmailConfigForStore(storeId)
    const verificationUrl = `${config.baseUrl}/verify-email?token=${verificationToken}`
    
    await this.sendEmail(email, verificationEmailTemplate, {
      userName,
      verificationUrl,
    }, storeId)
  }

  /**
   * Verify email transporter is configured
   */
  async isConfigured(): Promise<boolean> {
    await this.ensureInitialized()
    return this.transporter !== null
  }

  /**
   * Get test account info (for development)
   */
  getTestAccount(): nodemailer.TestAccount | null {
    return this.testAccount
  }
}

export const emailService = new EmailService()

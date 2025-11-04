import { EmailTemplate, EmailTemplateData } from './base'
import { getEmailConfig, createBaseEmailHTML, createCTAButton, createParagraph, createHeading } from './base'

/**
 * Email verification template data
 */
export interface VerificationEmailData extends EmailTemplateData {
  verificationUrl: string
}

/**
 * Email verification template
 */
export const verificationEmailTemplate: EmailTemplate = {
  subject: (data: EmailTemplateData) => {
    const config = getEmailConfig()
    return `Verify your email address - ${config.appName}`
  },

  html: (data: EmailTemplateData) => {
    const config = getEmailConfig()
    const verificationData = data as VerificationEmailData
    
    const greeting = verificationData.userName 
      ? `Hi ${verificationData.userName},` 
      : 'Hi there,'
    
    const content = `
      ${createHeading('Verify Your Email Address', 2, config)}
      
      ${createParagraph(greeting, config)}
      
      ${createParagraph(
        `Thank you for signing up for ${config.appName}! Please verify your email address by clicking the button below:`,
        config,
        { margin: '0 0 30px 0' }
      )}
      
      ${createCTAButton(verificationData.verificationUrl, 'Verify Email Address', config)}
      
      ${createParagraph(
        'If the button doesn\'t work, copy and paste this link into your browser:',
        config,
        { margin: '30px 0 0 0', fontSize: '14px' }
      )}
      
      ${createParagraph(
        verificationData.verificationUrl,
        config,
        { margin: '10px 0 0 0', fontSize: '12px', color: '#888888' }
      )}
      
      ${createParagraph(
        `This verification link will expire in 24 hours. If you didn't create an account with ${config.appName}, you can safely ignore this email.`,
        config,
        { margin: '30px 0 0 0', fontSize: '14px' }
      )}
    `
    
    return createBaseEmailHTML(config, content)
  },

  text: (data: EmailTemplateData) => {
    const config = getEmailConfig()
    const verificationData = data as VerificationEmailData
    
    const greeting = verificationData.userName 
      ? `Hi ${verificationData.userName},` 
      : 'Hi there,'
    
    return `${greeting}

Thank you for signing up for ${config.appName}! Please verify your email address by visiting this link:

${verificationData.verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with ${config.appName}, you can safely ignore this email.`
  },
}


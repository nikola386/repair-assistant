/**
 * Base email template structure and utilities
 */

export interface EmailTemplateData {
  userName?: string | null
  [key: string]: unknown
}

export interface EmailTemplate {
  subject: (data: EmailTemplateData) => string
  html: (data: EmailTemplateData) => string
  text: (data: EmailTemplateData) => string
}

export interface EmailConfig {
  appName: string
  primaryColor: string
  secondaryColor: string
  grayColor: string
  emailFrom: string
  baseUrl: string
}

/**
 * Get default email configuration
 */
export function getEmailConfig(): EmailConfig {
  return {
    appName: 'Repair Assistant',
    primaryColor: '#FFD700',
    secondaryColor: '#000000',
    grayColor: '#666666',
    emailFrom: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@repairassistant.com',
    baseUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  }
}

/**
 * Create base email HTML structure
 */
export function createBaseEmailHTML(
  config: EmailConfig,
  content: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.appName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); overflow: hidden;">
          <!-- Header with gradient background -->
          <tr>
            <td style="background: linear-gradient(135deg, ${config.primaryColor} 0%, #ffd54f 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: ${config.secondaryColor}; font-size: 28px; font-weight: 700;">
                ${config.appName}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0; color: ${config.grayColor}; font-size: 12px;">
                © ${new Date().getFullYear()} ${config.appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Create CTA button HTML
 */
export function createCTAButton(
  url: string,
  text: string,
  config: EmailConfig
): string {
  return `
<table role="presentation" style="width: 100%; margin: 30px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: ${config.primaryColor}; color: ${config.secondaryColor}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);">
        ${text}
      </a>
    </td>
  </tr>
</table>
  `.trim()
}

/**
 * Create paragraph HTML
 */
export function createParagraph(
  text: string,
  config: EmailConfig,
  options?: { margin?: string; fontSize?: string; color?: string }
): string {
  const margin = options?.margin || '0 0 20px 0'
  const fontSize = options?.fontSize || '16px'
  const color = options?.color || config.grayColor
  
  return `
<p style="margin: ${margin}; color: ${color}; font-size: ${fontSize}; line-height: 1.6;">
  ${text}
</p>
  `.trim()
}

/**
 * Create heading HTML
 */
export function createHeading(
  text: string,
  level: 1 | 2 | 3,
  config: EmailConfig
): string {
  const fontSize = level === 1 ? '28px' : level === 2 ? '24px' : '20px'
  
  return `
<h${level} style="margin: 0 0 20px 0; color: ${config.secondaryColor}; font-size: ${fontSize}; font-weight: ${level === 1 ? '700' : '600'};">
  ${text}
</h${level}>
  `.trim()
}


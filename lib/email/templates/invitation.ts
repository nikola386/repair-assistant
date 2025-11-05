import { EmailTemplate, EmailTemplateData } from './base'
import { getCurrentEmailConfig, createBaseEmailHTML, createCTAButton, createParagraph, createHeading } from './base'

/**
 * Invitation email template data
 */
export interface InvitationEmailData extends EmailTemplateData {
  acceptUrl: string
  inviterName: string
  storeName: string
  role: string
}

/**
 * Invitation email template
 */
export const invitationEmailTemplate: EmailTemplate = {
  subject: (data: EmailTemplateData) => {
    const config = getCurrentEmailConfig()
    const invitationData = data as InvitationEmailData
    return `You've been invited to join ${invitationData.storeName} - ${config.appName}`
  },

  html: (data: EmailTemplateData) => {
    const config = getCurrentEmailConfig()
    const invitationData = data as InvitationEmailData
    
    const greeting = `Hi there,`
    
    const roleDisplay = {
      ADMIN: 'Admin',
      MANAGER: 'Manager',
      TECHNICIAN: 'Technician',
      VIEWER: 'Viewer',
    }[invitationData.role] || invitationData.role
    
    const content = `
      ${createHeading('You\'ve Been Invited!', 2, config)}
      
      ${createParagraph(greeting, config)}
      
      ${createParagraph(
        `${invitationData.inviterName} has invited you to join <strong>${invitationData.storeName}</strong> on ${config.appName} as a <strong>${roleDisplay}</strong>.`,
        config,
        { margin: '0 0 30px 0' }
      )}
      
      ${createParagraph(
        'Click the button below to accept the invitation and create your account:',
        config,
        { margin: '0 0 30px 0' }
      )}
      
      ${createCTAButton(invitationData.acceptUrl, 'Accept Invitation', config)}
      
      ${createParagraph(
        'If the button doesn\'t work, copy and paste this link into your browser:',
        config,
        { margin: '30px 0 0 0', fontSize: '14px' }
      )}
      
      ${createParagraph(
        invitationData.acceptUrl,
        config,
        { margin: '10px 0 0 0', fontSize: '12px', color: '#888888' }
      )}
      
      ${createParagraph(
        `This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.`,
        config,
        { margin: '30px 0 0 0', fontSize: '14px' }
      )}
    `
    
    return createBaseEmailHTML(config, content)
  },

  text: (data: EmailTemplateData) => {
    const config = getCurrentEmailConfig()
    const invitationData = data as InvitationEmailData
    
    const roleDisplay = {
      ADMIN: 'Admin',
      MANAGER: 'Manager',
      TECHNICIAN: 'Technician',
      VIEWER: 'Viewer',
    }[invitationData.role] || invitationData.role
    
    return `Hi there,

${invitationData.inviterName} has invited you to join ${invitationData.storeName} on ${config.appName} as a ${roleDisplay}.

Accept the invitation by visiting this link:

${invitationData.acceptUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.`
  },
}


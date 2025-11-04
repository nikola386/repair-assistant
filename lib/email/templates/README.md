# Email Templates

This directory contains reusable email templates for the Repair Assistant application.

## Structure

- `base.ts` - Base template utilities and interfaces
- `verification.ts` - Email verification template
- `index.ts` - Exports all templates

## Adding a New Email Template

To add a new email template:

1. Create a new file in this directory (e.g., `welcome.ts`)

2. Define your template data interface:

```typescript
import { EmailTemplateData } from './base'

export interface WelcomeEmailData extends EmailTemplateData {
  userName: string
  dashboardUrl: string
}
```

3. Create your template:

```typescript
import { EmailTemplate, EmailTemplateData } from './base'
import { getEmailConfig, createBaseEmailHTML, createCTAButton, createParagraph, createHeading } from './base'

export const welcomeEmailTemplate: EmailTemplate = {
  subject: (data: EmailTemplateData) => {
    const config = getEmailConfig()
    return `Welcome to ${config.appName}!`
  },

  html: (data: EmailTemplateData) => {
    const config = getEmailConfig()
    const welcomeData = data as WelcomeEmailData
    
    const content = `
      ${createHeading('Welcome!', 2, config)}
      
      ${createParagraph(`Hi ${welcomeData.userName},`, config)}
      
      ${createParagraph(
        `Welcome to ${config.appName}! We're excited to have you on board.`,
        config
      )}
      
      ${createCTAButton(welcomeData.dashboardUrl, 'Go to Dashboard', config)}
    `
    
    return createBaseEmailHTML(config, content)
  },

  text: (data: EmailTemplateData) => {
    const config = getEmailConfig()
    const welcomeData = data as WelcomeEmailData
    
    return `Hi ${welcomeData.userName},

Welcome to ${config.appName}! We're excited to have you on board.

Visit your dashboard: ${welcomeData.dashboardUrl}`
  },
}
```

4. Export it from `index.ts`:

```typescript
export { welcomeEmailTemplate } from './welcome'
export type { WelcomeEmailData } from './welcome'
```

5. Use it in your code:

```typescript
import { emailService } from '@/lib/email'
import { welcomeEmailTemplate } from '@/lib/email/templates'

await emailService.sendEmail(
  user.email,
  welcomeEmailTemplate,
  {
    userName: user.name,
    dashboardUrl: `${baseUrl}/dashboard`,
  }
)
```

## Available Template Utilities

- `createBaseEmailHTML(config, content)` - Creates the base email structure
- `createCTAButton(url, text, config)` - Creates a call-to-action button
- `createParagraph(text, config, options?)` - Creates a paragraph
- `createHeading(text, level, config)` - Creates a heading (h1, h2, h3)
- `getEmailConfig()` - Gets the email configuration

## Template Data Interface

All templates extend `EmailTemplateData`:

```typescript
interface EmailTemplateData {
  userName?: string | null
  [key: string]: unknown  // Additional properties are allowed
}
```

Extend this interface for your specific template needs.


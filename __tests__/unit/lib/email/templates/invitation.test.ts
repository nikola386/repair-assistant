import { invitationEmailTemplate, InvitationEmailData } from '@/lib/email/templates/invitation'
import { getEmailConfig, setEmailConfig } from '@/lib/email/templates/base'

describe('invitationEmailTemplate', () => {
  beforeEach(() => {
    setEmailConfig(getEmailConfig())
  })

  it('should generate subject with store name', () => {
    const data: InvitationEmailData = {
      acceptUrl: 'https://example.com/accept?token=123',
      inviterName: 'John Doe',
      storeName: 'Test Store',
      role: 'TECHNICIAN',
    }

    const subject = invitationEmailTemplate.subject(data)

    expect(subject).toContain('Test Store')
    expect(subject).toContain('Repair Assistant')
  })

  it('should generate HTML email with invitation details', () => {
    const data: InvitationEmailData = {
      acceptUrl: 'https://example.com/accept?token=123',
      inviterName: 'John Doe',
      storeName: 'Test Store',
      role: 'TECHNICIAN',
    }

    const html = invitationEmailTemplate.html(data)

    expect(html).toContain('https://example.com/accept?token=123')
    expect(html).toContain('Accept Invitation')
    expect(html).toContain('John Doe')
    expect(html).toContain('Test Store')
    expect(html).toContain('Technician')
  })

  it('should display role correctly', () => {
    const roles = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']
    
    roles.forEach((role) => {
      const data: InvitationEmailData = {
        acceptUrl: 'https://example.com/accept',
        inviterName: 'John',
        storeName: 'Store',
        role,
      }

      const html = invitationEmailTemplate.html(data)
      expect(html).toContain(role === 'ADMIN' ? 'Admin' : role === 'MANAGER' ? 'Manager' : role === 'TECHNICIAN' ? 'Technician' : 'Viewer')
    })
  })

  it('should generate text email', () => {
    const data: InvitationEmailData = {
      acceptUrl: 'https://example.com/accept?token=123',
      inviterName: 'John Doe',
      storeName: 'Test Store',
      role: 'TECHNICIAN',
    }

    const text = invitationEmailTemplate.text(data)

    expect(text).toContain('https://example.com/accept?token=123')
    expect(text).toContain('John Doe')
    expect(text).toContain('Test Store')
    expect(text).toContain('Technician')
  })
})


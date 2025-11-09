import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InviteUserModal from '@/components/users/InviteUserModal'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('InviteUserModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockUseLanguage.mockReturnValue({
      t: {
        team: {
          inviteUserTitle: 'Invite User',
          inviteError: 'Failed to invite user',
          emailAddress: 'Email Address',
          emailPlaceholder: 'Enter email address',
          role: 'Role',
          roles: {
            viewer: 'Viewer',
            technician: 'Technician',
            manager: 'Manager',
            admin: 'Admin',
          },
          roleDescriptions: {
            admin: 'Admin description',
            manager: 'Manager description',
            technician: 'Technician description',
            viewer: 'Viewer description',
          },
          sending: 'Sending...',
          sendInvitation: 'Send Invitation',
        },
        common: {
          actions: {
            submit: 'Submit',
            cancel: 'Cancel',
          },
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  it('should render modal with form', () => {
    render(<InviteUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    expect(screen.getByText('Invite User')).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
  })

  it('should call onClose when backdrop is clicked', () => {
    render(<InviteUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const backdrop = screen.getByText('Invite User').closest('.inventory-modal')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('should submit form with email and role', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Invitation sent' }),
    })

    render(<InviteUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    const submitButton = screen.getByRole('button', { name: /Send Invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          role: 'TECHNICIAN',
        }),
      })
    })
  })

  it('should call onSuccess when invitation is successful', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Invitation sent' }),
    })

    render(<InviteUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    const submitButton = screen.getByRole('button', { name: /Send Invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should display error when invitation fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'User already exists' }),
    })

    render(<InviteUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    const submitButton = screen.getByRole('button', { name: /Send Invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/User already exists/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    render(<InviteUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const submitButton = screen.getByRole('button', { name: /Send Invitation/i })
    fireEvent.click(submitButton)

    // Zod validation should prevent submission
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})


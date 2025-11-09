import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WarrantyClaimForm from '@/components/warranties/WarrantyClaimForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { showAlert } from '@/lib/alerts'

jest.mock('@/contexts/LanguageContext')
jest.mock('@/lib/alerts')

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>
const mockShowAlert = showAlert as jest.Mocked<typeof showAlert>

describe('WarrantyClaimForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockUseLanguage.mockReturnValue({
      t: {
        warranties: {
          claim: {
            issueDescription: 'Issue Description',
            issueDescriptionRequired: 'Issue description is required',
            issueDescriptionPlaceholder: 'Describe the issue...',
            createClaim: 'Create Claim',
            createSuccess: 'Claim created successfully',
            createError: 'Failed to create claim',
          },
        },
        common: {
          messages: {
            creating: 'Creating...',
          },
          actions: {
            cancel: 'Cancel',
          },
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  it('should render form with textarea', () => {
    render(<WarrantyClaimForm warrantyId="warranty-1" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    // Use getByText to find the label, then find the textarea
    expect(screen.getByText(/Issue Description/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Claim/i })).toBeInTheDocument()
  })

  it('should show error when submitting empty form', async () => {
    render(<WarrantyClaimForm warrantyId="warranty-1" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    const submitButton = screen.getByRole('button', { name: /Create Claim/i })
    const form = submitButton.closest('form')
    
    // Submit the form directly to bypass HTML5 validation
    if (form) {
      fireEvent.submit(form, { preventDefault: jest.fn() })
    } else {
      fireEvent.click(submitButton)
    }

    await waitFor(() => {
      expect(mockShowAlert.error).toHaveBeenCalled()
    }, { timeout: 1000 })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should submit form successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Claim created' }),
    })

    render(<WarrantyClaimForm warrantyId="warranty-1" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Screen is cracked' } })

    const submitButton = screen.getByRole('button', { name: /Create Claim/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/warranties/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warrantyId: 'warranty-1',
          issueDescription: 'Screen is cracked',
        }),
      })
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should call onCancel when cancel button is clicked', () => {
    render(<WarrantyClaimForm warrantyId="warranty-1" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should show error when API call fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Warranty not found' }),
    })

    render(<WarrantyClaimForm warrantyId="warranty-1" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Screen is cracked' } })

    const submitButton = screen.getByRole('button', { name: /Create Claim/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockShowAlert.error).toHaveBeenCalled()
    })
  })

  it('should disable submit button while submitting', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)))

    render(<WarrantyClaimForm warrantyId="warranty-1" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Screen is cracked' } })

    const submitButton = screen.getByRole('button', { name: /Create Claim/i })
    fireEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
  })
})


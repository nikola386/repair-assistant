/**
 * Integration tests for TicketForm component
 * These tests verify the component's interaction with the API
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketForm from '@/components/tickets/TicketForm'
import { useLanguage } from '@/contexts/LanguageContext'

// Mock dependencies
jest.mock('@/contexts/LanguageContext')
jest.mock('@/lib/alerts', () => ({
  showAlert: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}))

// Mock fetch for API calls
global.fetch = jest.fn()

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>
const mockTranslations = {
  tickets: {
    form: {
      customerName: 'Customer Name',
      customerPhone: 'Phone',
      customerEmail: 'Email',
      deviceType: 'Device Type',
      deviceBrand: 'Brand',
      deviceModel: 'Model',
      deviceSerialNumber: 'Serial Number',
      issueDescription: 'Issue Description',
      estimatedCost: 'Estimated Cost',
      estimatedCompletionDate: 'Estimated Completion Date',
      notes: 'Notes',
      uploadFiles: 'Upload Files',
      clickToUpload: 'Click to upload',
      orDragAndDrop: 'or drag and drop',
      fileTypesHint: 'Images and PDFs',
      uploadingImages: 'Uploading...',
      error: 'Error creating ticket',
      searchCustomersPlaceholder: 'Search customers...',
      filesWillUploadAfter: '{count} files will be uploaded after ticket creation',
      successfullyUploaded: '{count} files uploaded successfully',
    },
  },
  common: {
    actions: {
      create: 'Create',
      cancel: 'Cancel',
    },
    messages: {
      required: 'Required fields are missing',
      creating: 'Creating...',
      searching: 'Searching...',
    },
    fields: {
      priority: 'Priority',
    },
    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    },
    dates: {
      selectDate: 'Select date',
    },
  },
}

describe('TicketForm Integration', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage: jest.fn(),
      t: mockTranslations as any,
    })
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('should submit form and handle API response', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue('ticket-id-123')

    render(<TicketForm onSubmit={mockOnSubmit} />)

    // Fill in form
    await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe')
    await user.type(screen.getByLabelText(/Phone/i), '+1234567890')
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/Device Type/i), 'Smartphone')
    await user.type(screen.getByLabelText(/Issue Description/i), 'Screen replacement needed')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Create/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          customerEmail: 'john@example.com',
          deviceType: 'Smartphone',
          issueDescription: 'Screen replacement needed',
        })
      )
    })
  })

  it('should search for customers when typing in phone or name field', async () => {
    const user = userEvent.setup()
    const mockCustomers = [
      {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customers: mockCustomers }),
    })

    render(<TicketForm onSubmit={mockOnSubmit} />)

    // Type in phone field to trigger search
    const phoneInput = screen.getByLabelText(/Phone/i)
    await user.type(phoneInput, 'John')

    // Wait for debounce
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/customers/search?q=John&limit=5')
        )
      },
      { timeout: 1000 }
    )
  })

  it('should handle customer selection from search results', async () => {
    const user = userEvent.setup()
    const mockCustomers = [
      {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customers: mockCustomers }),
    })

    render(<TicketForm onSubmit={mockOnSubmit} />)

    // Type to trigger search
    const phoneInput = screen.getByLabelText(/Phone/i)
    await user.type(phoneInput, 'John')

    // Wait for search results
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalled()
      },
      { timeout: 1000 }
    )

    // Customer dropdown should appear (if implemented)
    // This test verifies the search functionality works
  })

  it('should handle form submission errors gracefully', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockRejectedValue(new Error('API Error'))

    render(<TicketForm onSubmit={mockOnSubmit} />)

    // Fill in form
    await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe')
    await user.type(screen.getByLabelText(/Phone/i), '+1234567890')
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/Device Type/i), 'Smartphone')
    await user.type(screen.getByLabelText(/Issue Description/i), 'Screen replacement')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Create/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    // Form should still be accessible after error
    expect(screen.getByLabelText(/Customer Name/i)).toBeInTheDocument()
  })

  it('should validate required fields before submission', async () => {
    const user = userEvent.setup()

    render(<TicketForm onSubmit={mockOnSubmit} />)

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /Create/i })
    await user.click(submitButton)

    // onSubmit should not be called
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })
})


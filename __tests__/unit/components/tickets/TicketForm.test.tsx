import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('TicketForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage: jest.fn(),
      t: mockTranslations as any,
    })
  })

  it('should render form with all fields', () => {
    render(<TicketForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/Customer Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Device Type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Issue Description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument()
  })

  it('should call onSubmit with form data when submitted', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue('ticket-id')

    render(<TicketForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe')
    await user.type(screen.getByLabelText(/Phone/i), '+1234567890')
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/Device Type/i), 'Smartphone')
    await user.type(screen.getByLabelText(/Issue Description/i), 'Screen replacement needed')

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

  it('should not submit when required fields are missing', async () => {
    const user = userEvent.setup()

    render(<TicketForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /Create/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()

    render(<TicketForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should populate form with initialData', () => {
    const initialData = {
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: '+0987654321',
      deviceType: 'Laptop',
      issueDescription: 'Keyboard replacement',
      priority: 'high' as const,
    }

    render(<TicketForm onSubmit={mockOnSubmit} initialData={initialData} />)

    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+0987654321')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Laptop')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Keyboard replacement')).toBeInTheDocument()
  })

  it('should update form fields when user types', async () => {
    const user = userEvent.setup()

    render(<TicketForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/Customer Name/i)
    await user.type(nameInput, 'Test Customer')

    expect(nameInput).toHaveValue('Test Customer')
  })

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup()
    let resolveSubmit: (value: string) => void
    const submitPromise = new Promise<string>((resolve) => {
      resolveSubmit = resolve
    })
    mockOnSubmit.mockReturnValue(submitPromise)

    render(<TicketForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText(/Customer Name/i), 'John Doe')
    await user.type(screen.getByLabelText(/Phone/i), '+1234567890')
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/Device Type/i), 'Smartphone')
    await user.type(screen.getByLabelText(/Issue Description/i), 'Screen replacement')

    const submitButton = screen.getByRole('button', { name: /Create/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })

    resolveSubmit!('ticket-id')
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })
})


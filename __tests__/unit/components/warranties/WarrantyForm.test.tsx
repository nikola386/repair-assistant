import { render, screen } from '@testing-library/react'
import WarrantyForm from '@/components/warranties/WarrantyForm'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')
jest.mock('@/lib/alerts', () => ({
  showAlert: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>
const mockTranslations = {
  warranties: {
    form: {
      warrantyPeriod: 'Warranty Period',
      warrantyType: 'Warranty Type',
      startDate: 'Start Date',
      terms: 'Terms',
      notes: 'Notes',
    },
    type: {
      parts: 'Parts',
      labor: 'Labor',
      both: 'Both',
    },
  },
  common: {
    actions: {
      save: 'Save',
      cancel: 'Cancel',
    },
  },
}

describe('WarrantyForm', () => {
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

  it('should render warranty form fields', () => {
    render(
      <WarrantyForm
        ticketId="ticket-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Check for form fields by their text content or placeholders
    expect(screen.getByText(/Warranty Period/i)).toBeInTheDocument()
    expect(screen.getByText(/Warranty Type/i)).toBeInTheDocument()
  })
})


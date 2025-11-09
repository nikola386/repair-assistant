import { render, screen } from '@testing-library/react'
import WarrantyCard from '@/components/warranties/WarrantyCard'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')
jest.mock('@/components/warranties/WarrantyStatusBadge', () => {
  return function MockWarrantyStatusBadge({ status }: { status: string }) {
    return <span data-testid="status-badge">{status}</span>
  }
})

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('WarrantyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      t: {
        warranties: {
          type: {
            parts: 'Parts',
            labor: 'Labor',
            both: 'Both',
          },
          card: {
            type: 'Type',
            period: 'Period',
            expires: 'Expires',
            claim: 'claim',
            claims: 'claims',
            unknownCustomer: 'Unknown Customer',
          },
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  const mockWarranty = {
    id: 'warranty-1',
    ticketId: 'ticket-1',
    status: 'active',
    warrantyType: 'both',
    warrantyPeriodDays: 30,
    expiryDate: new Date('2024-12-31').toISOString(),
    ticket: {
      ticketNumber: 'TK-001',
      customerName: 'John Doe',
      deviceType: 'Smartphone',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
    },
    customer: {
      name: 'John Doe',
    },
    warrantyClaims: [],
  }

  it('should render warranty card with basic information', () => {
    render(<WarrantyCard warranty={mockWarranty as any} />)

    expect(screen.getByText('TK-001')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText(/Smartphone/)).toBeInTheDocument()
    expect(screen.getByText(/Apple/)).toBeInTheDocument()
    expect(screen.getByText(/iPhone 13/)).toBeInTheDocument()
  })

  it('should display warranty type', () => {
    render(<WarrantyCard warranty={mockWarranty as any} />)

    expect(screen.getByText(/Type/)).toBeInTheDocument()
    expect(screen.getByText(/Both/)).toBeInTheDocument()
  })

  it('should display warranty period', () => {
    render(<WarrantyCard warranty={mockWarranty as any} />)

    expect(screen.getByText(/Period/)).toBeInTheDocument()
    expect(screen.getByText(/30 days/)).toBeInTheDocument()
  })

  it('should display expiry date', () => {
    render(<WarrantyCard warranty={mockWarranty as any} />)

    expect(screen.getByText(/Expires/)).toBeInTheDocument()
  })

  it('should display warranty status badge', () => {
    render(<WarrantyCard warranty={mockWarranty as any} />)

    expect(screen.getByTestId('status-badge')).toBeInTheDocument()
    expect(screen.getByTestId('status-badge').textContent).toBe('active')
  })

  it('should display claims count when claims exist', () => {
    const warrantyWithClaims = {
      ...mockWarranty,
      warrantyClaims: [{ id: 'claim-1' }, { id: 'claim-2' }],
    }

    render(<WarrantyCard warranty={warrantyWithClaims as any} />)

    expect(screen.getByText(/2 claims/)).toBeInTheDocument()
  })

  it('should display singular claim when only one claim exists', () => {
    const warrantyWithClaim = {
      ...mockWarranty,
      warrantyClaims: [{ id: 'claim-1' }],
    }

    render(<WarrantyCard warranty={warrantyWithClaim as any} />)

    expect(screen.getByText(/1 claim/)).toBeInTheDocument()
  })

  it('should handle missing ticket information', () => {
    const warrantyWithoutTicket = {
      ...mockWarranty,
      ticket: null,
    }

    render(<WarrantyCard warranty={warrantyWithoutTicket as any} />)

    // N/A may appear multiple times, so use getAllByText
    const naElements = screen.getAllByText('N/A')
    expect(naElements.length).toBeGreaterThan(0)
  })

  it('should use customer name from warranty when ticket customer name is missing', () => {
    const warrantyWithCustomer = {
      ...mockWarranty,
      ticket: {
        ...mockWarranty.ticket,
        customerName: null,
      },
    }

    render(<WarrantyCard warranty={warrantyWithCustomer as any} />)

    // Use getAllByText since customer name may appear multiple times
    const customerNames = screen.getAllByText('John Doe')
    expect(customerNames.length).toBeGreaterThan(0)
  })

  it('should display unknown customer when no customer info available', () => {
    const warrantyWithoutCustomer = {
      ...mockWarranty,
      ticket: {
        ...mockWarranty.ticket,
        customerName: null,
      },
      customer: null,
    }

    render(<WarrantyCard warranty={warrantyWithoutCustomer as any} />)

    expect(screen.getByText('Unknown Customer')).toBeInTheDocument()
  })
})


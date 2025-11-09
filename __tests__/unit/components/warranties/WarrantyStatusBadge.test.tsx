import { render, screen } from '@testing-library/react'
import WarrantyStatusBadge from '@/components/warranties/WarrantyStatusBadge'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('WarrantyStatusBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      t: {
        warranties: {
          status: {
            active: 'Active',
            expired: 'Expired',
            voided: 'Voided',
            claimed: 'Claimed',
            expiringSoon: 'Expiring Soon',
          },
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  it('should render active status', () => {
    render(<WarrantyStatusBadge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should render expired status', () => {
    render(<WarrantyStatusBadge status="expired" />)
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('should render voided status', () => {
    render(<WarrantyStatusBadge status="voided" />)
    expect(screen.getByText('Voided')).toBeInTheDocument()
  })

  it('should render claimed status', () => {
    render(<WarrantyStatusBadge status="claimed" />)
    expect(screen.getByText('Claimed')).toBeInTheDocument()
  })

  it('should apply correct status class', () => {
    const { container } = render(<WarrantyStatusBadge status="active" />)
    const badge = container.querySelector('.warranty-status')
    expect(badge).toHaveClass('warranty-status--active')
  })

  it('should show expiring soon when expiry is within 7 days', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const expiryDate = futureDate.toISOString()

    render(<WarrantyStatusBadge status="active" expiryDate={expiryDate} />)
    expect(screen.getByText(/Expiring Soon/i)).toBeInTheDocument()
  })

  it('should not show expiring soon when expiry is more than 7 days away', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    const expiryDate = futureDate.toISOString()

    render(<WarrantyStatusBadge status="active" expiryDate={expiryDate} />)
    expect(screen.queryByText(/Expiring Soon/i)).not.toBeInTheDocument()
  })

  it('should not show expiring soon when status is not active', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const expiryDate = futureDate.toISOString()

    render(<WarrantyStatusBadge status="expired" expiryDate={expiryDate} />)
    expect(screen.queryByText(/Expiring Soon/i)).not.toBeInTheDocument()
  })

  it('should not show expiring soon when expiry date is in the past', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    const expiryDate = pastDate.toISOString()

    render(<WarrantyStatusBadge status="active" expiryDate={expiryDate} />)
    expect(screen.queryByText(/Expiring Soon/i)).not.toBeInTheDocument()
  })

  it('should apply expiring-soon class when expiring soon', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const expiryDate = futureDate.toISOString()

    const { container } = render(<WarrantyStatusBadge status="active" expiryDate={expiryDate} />)
    const badge = container.querySelector('.warranty-status')
    expect(badge).toHaveClass('warranty-status--expiring-soon')
  })
})


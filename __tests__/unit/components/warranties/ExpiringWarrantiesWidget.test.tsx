import { render, screen, waitFor } from '@testing-library/react'
import ExpiringWarrantiesWidget from '@/components/warranties/ExpiringWarrantiesWidget'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})
jest.mock('@/components/warranties/WarrantyStatusBadge', () => {
  return function MockWarrantyStatusBadge({ status }: { status: string }) {
    return <span data-testid="status-badge">{status}</span>
  }
})
jest.mock('@/components/ui/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner">Loading...</div>
  }
})

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('ExpiringWarrantiesWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockUseLanguage.mockReturnValue({
      t: {
        warranties: {
          widget: {
            expiringWarranties: 'Expiring Warranties',
            viewAll: 'View All',
            noExpiringWarranties: 'No warranties expiring in the next {days} days',
            expires: 'Expires',
          },
          card: {
            unknownCustomer: 'Unknown Customer',
          },
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  it('should show loading spinner initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<ExpiringWarrantiesWidget />)

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('should display expiring warranties', async () => {
    const mockWarranties = [
      {
        id: 'warranty-1',
        status: 'active',
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        ticket: { ticketNumber: 'TK-001', customerName: 'John Doe' },
        customer: { name: 'John Doe' },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ warranties: mockWarranties }),
    })

    render(<ExpiringWarrantiesWidget />)

    await waitFor(() => {
      expect(screen.getByText(/TK-001/)).toBeInTheDocument()
    })
  })

  it('should display empty message when no warranties expiring', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ warranties: [] }),
    })

    render(<ExpiringWarrantiesWidget />)

    await waitFor(() => {
      expect(screen.getByText(/No warranties expiring/)).toBeInTheDocument()
    })
  })

  it('should use custom daysAhead parameter', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ warranties: [] }),
    })

    render(<ExpiringWarrantiesWidget daysAhead={60} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/warranties/expiring?days=60')
    })
  })

  it('should display warranty count in header', async () => {
    const mockWarranties = [
      { id: 'warranty-1', status: 'active', expiryDate: new Date().toISOString() },
      { id: 'warranty-2', status: 'active', expiryDate: new Date().toISOString() },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ warranties: mockWarranties }),
    })

    render(<ExpiringWarrantiesWidget />)

    await waitFor(() => {
      expect(screen.getByText(/Expiring Warranties \(2\)/)).toBeInTheDocument()
    })
  })

  it('should limit display to 5 warranties', async () => {
    const mockWarranties = Array.from({ length: 10 }, (_, i) => ({
      id: `warranty-${i}`,
      status: 'active',
      expiryDate: new Date().toISOString(),
      ticket: { ticketNumber: `TK-${i}`, customerName: 'Customer' },
    }))

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ warranties: mockWarranties }),
    })

    render(<ExpiringWarrantiesWidget />)

    await waitFor(() => {
      const items = screen.getAllByText(/TK-/)
      expect(items.length).toBeLessThanOrEqual(5)
    })
  })
})


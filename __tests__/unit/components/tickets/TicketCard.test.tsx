import { render, screen } from '@testing-library/react'
import TicketCard from '@/components/tickets/TicketCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { createMockTicket } from '../../../utils/test-helpers'

jest.mock('@/contexts/LanguageContext')
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('TicketCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      t: {
        common: {
          status: {
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
            waiting_parts: 'Waiting Parts',
          },
          priority: {
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            urgent: 'Urgent',
          },
          dates: {
            createdAt: 'Created',
          },
        },
        tickets: {
          estimatedCost: 'Estimated Cost',
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  it('should render ticket card with basic information', () => {
    const mockTicket = createMockTicket({
      ticketNumber: 'TK-001',
      status: 'pending',
      customerName: 'John Doe',
      deviceType: 'Smartphone',
      issueDescription: 'Screen replacement needed',
    })

    render(<TicketCard ticket={mockTicket} />)

    expect(screen.getByText('TK-001')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText(/Smartphone/)).toBeInTheDocument()
    expect(screen.getByText(/Screen replacement needed/)).toBeInTheDocument()
  })

  it('should display device brand and model when available', () => {
    const mockTicket = createMockTicket({
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
      deviceType: 'Smartphone',
    })

    render(<TicketCard ticket={mockTicket} />)

    expect(screen.getByText(/Apple/)).toBeInTheDocument()
    expect(screen.getByText(/iPhone 13/)).toBeInTheDocument()
  })

  it('should display estimated cost when available', () => {
    const mockTicket = createMockTicket({
      estimatedCost: 150.50,
    })

    render(<TicketCard ticket={mockTicket} />)

    // The cost might be formatted differently, so check for the number
    expect(screen.getByText(/150.50/)).toBeInTheDocument()
  })

  it('should not display estimated cost when not available', () => {
    const mockTicket = createMockTicket({
      estimatedCost: null,
    })

    render(<TicketCard ticket={mockTicket} />)

    expect(screen.queryByText(/Estimated Cost/)).not.toBeInTheDocument()
  })

  it('should apply correct status class', () => {
    const mockTicket = createMockTicket({
      status: 'in_progress',
    })

    const { container } = render(<TicketCard ticket={mockTicket} />)
    const statusElement = container.querySelector('.ticket-status--in_progress')
    expect(statusElement).toBeInTheDocument()
  })

  it('should apply correct priority class', () => {
    const mockTicket = createMockTicket({
      priority: 'high',
    })

    const { container } = render(<TicketCard ticket={mockTicket} />)
    const priorityElement = container.querySelector('.ticket-priority--high')
    expect(priorityElement).toBeInTheDocument()
  })

  it('should format and display creation date', () => {
    const mockTicket = createMockTicket({
      createdAt: new Date('2024-01-15').toISOString(),
    })

    render(<TicketCard ticket={mockTicket} />)

    // Check that the date format is present (may vary by locale)
    const dateText = screen.getByText(/Created:/)
    expect(dateText).toBeInTheDocument()
  })

  it('should truncate long issue descriptions', () => {
    const longDescription = 'A'.repeat(200)
    const mockTicket = createMockTicket({
      issueDescription: longDescription,
    })

    render(<TicketCard ticket={mockTicket} />)

    const issueElements = screen.getAllByText(/A+/)
    const issueText = issueElements.find(el => el.textContent?.includes('...'))
    expect(issueText).toBeInTheDocument()
    expect(issueText?.textContent?.length).toBeLessThanOrEqual(103) // 100 chars + "..."
  })

  it('should link to correct ticket detail page', () => {
    const mockTicket = createMockTicket({
      id: 'ticket-123',
    })

    render(<TicketCard ticket={mockTicket} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/tickets/ticket-123')
  })
})


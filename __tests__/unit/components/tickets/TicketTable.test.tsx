import { render, screen } from '@testing-library/react'
import TicketTable from '@/components/tickets/TicketTable'
import { useLanguage } from '@/contexts/LanguageContext'
import { RepairTicket } from '@/types/ticket'

// Mock dependencies
jest.mock('@/contexts/LanguageContext')
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>
})
jest.mock('@/lib/filterPersistence', () => ({
  filterPersistence: {
    loadTicketsSorting: jest.fn(() => []),
    saveTicketsSorting: jest.fn(),
  },
}))

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>
const mockTranslations = {
  tickets: {
    form: {
      customerName: 'Customer',
    },
    deviceInfo: 'Device',
  },
  common: {
    fields: {
      status: 'Status',
    },
    status: {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    dates: {
      date: 'Date',
    },
    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    },
  },
}

describe('TicketTable', () => {
  const mockTickets: RepairTicket[] = [
    {
      id: 'ticket-1',
      ticketNumber: 'TK-001',
      customerId: 'customer-1',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      deviceType: 'Smartphone',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
      issueDescription: 'Screen replacement',
      status: 'pending',
      priority: 'medium',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'ticket-2',
      ticketNumber: 'TK-002',
      customerId: 'customer-2',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      customerPhone: '+0987654321',
      deviceType: 'Laptop',
      deviceBrand: 'Dell',
      deviceModel: 'XPS 13',
      issueDescription: 'Keyboard replacement',
      status: 'in_progress',
      priority: 'high',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage: jest.fn(),
      t: mockTranslations as any,
    })
  })

  it('should render table with tickets', () => {
    render(<TicketTable tickets={mockTickets} />)

    expect(screen.getByText('TK-001')).toBeInTheDocument()
    expect(screen.getByText('TK-002')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should render device information correctly', () => {
    render(<TicketTable tickets={mockTickets} />)

    expect(screen.getByText(/Smartphone.*Apple.*iPhone 13/i)).toBeInTheDocument()
    expect(screen.getByText(/Laptop.*Dell.*XPS 13/i)).toBeInTheDocument()
  })

  it('should render empty state when no tickets', () => {
    render(<TicketTable tickets={[]} />)

    // Table should still render, just with no data rows
    expect(screen.queryByText('TK-001')).not.toBeInTheDocument()
  })

  it('should render ticket numbers as links', () => {
    render(<TicketTable tickets={mockTickets} />)

    const ticketLink = screen.getByText('TK-001').closest('a')
    expect(ticketLink).toHaveAttribute('href', '/tickets/ticket-1')
  })

  it('should render customer names as links', () => {
    render(<TicketTable tickets={mockTickets} />)

    const customerLink = screen.getByText('John Doe').closest('a')
    expect(customerLink).toHaveAttribute('href', '/clients/customer-1')
  })
})


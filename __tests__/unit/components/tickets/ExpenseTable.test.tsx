import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseTable from '@/components/tickets/ExpenseTable'
import { useLanguage } from '@/contexts/LanguageContext'
import { Expense } from '@/types/ticket'

jest.mock('@/contexts/LanguageContext')
jest.mock('@/lib/alerts', () => ({
  showAlert: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))
jest.mock('@/lib/useConfirmation', () => ({
  useConfirmation: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    isOpen: false,
    title: undefined,
    message: '',
    confirmText: undefined,
    cancelText: undefined,
    variant: undefined,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }),
}))
jest.mock('@/components/ui/ConfirmationModal', () => ({
  __esModule: true,
  default: () => null,
}))

global.fetch = jest.fn()

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>
const mockTranslations = {
  tickets: {
    expenses: {
      title: 'Expenses',
      addExpense: 'Add Expense',
      name: 'Name',
      quantity: 'Quantity',
      price: 'Price',
      total: 'Total',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      noExpenses: 'No expenses',
      deleteConfirm: 'Are you sure you want to delete this expense?',
      expenseName: 'Expense Name',
    },
  },
  common: {
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
    },
    fields: {
      name: 'Name',
      quantity: 'Quantity',
      price: 'Price',
      total: 'Total',
    },
    labels: {
      actions: 'Actions',
    },
    messages: {
      required: 'All fields are required',
    },
  },
}

describe('ExpenseTable', () => {
  // Create stable expense arrays to avoid infinite loops
  const createMockExpenses = (): Expense[] => [
    {
      id: 'expense-1',
      ticketId: 'ticket-1',
      name: 'Screen Replacement',
      quantity: 1,
      price: 50.00,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage: jest.fn(),
      t: mockTranslations as any,
    })
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/inventory')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: [] }),
        })
      }
      if (url.includes('/api/tickets')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ expenses: [] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })
  })

  it('should render expenses table', async () => {
    const mockExpenses = createMockExpenses()
    const { unmount } = render(
      <ExpenseTable
        ticketId="ticket-1"
        initialExpenses={mockExpenses}
        editable={true}
      />
    )

    // Wait for any async operations to complete
    await waitFor(() => {
      expect(screen.getByText('Screen Replacement')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('1')).toBeInTheDocument()
    // $50.00 appears multiple times (price and total), so use getAllByText
    const priceElements = screen.getAllByText('$50.00')
    expect(priceElements.length).toBeGreaterThan(0)
    
    // Cleanup
    unmount()
  })

  // it('should fetch expenses on mount when not provided', async () => {
  //   const mockExpenses = createMockExpenses()
  //   ;(global.fetch as jest.Mock).mockResolvedValueOnce({
  //     ok: true,
  //     json: async () => ({ expenses: mockExpenses }),
  //   })

  //   render(
  //     <ExpenseTable
  //       ticketId="ticket-1"
  //       editable={true}
  //     />
  //   )

  //   await waitFor(() => {
  //     expect(global.fetch).toHaveBeenCalledWith('/api/tickets/ticket-1/expenses')
  //   }, { timeout: 3000 })
  // })

  it('should show add expense form when add button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ExpenseTable
        ticketId="ticket-1"
        initialExpenses={[]}
        editable={true}
      />
    )

    const addButton = screen.getByText(/Add Expense/i)
    await user.click(addButton)

    // ExpenseTable uses placeholders, not labels
    expect(screen.getByPlaceholderText(/Expense Name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Quantity/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Price/i)).toBeInTheDocument()
  })

  it('should not show add button when not editable', async () => {
    const mockExpenses = createMockExpenses()
    render(
      <ExpenseTable
        ticketId="ticket-1"
        initialExpenses={mockExpenses}
        editable={false}
      />
    )

    // Wait for any async operations to complete
    await waitFor(() => {
      expect(screen.queryByText(/Add Expense/i)).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should display total correctly', async () => {
    const expenses: Expense[] = [
      {
        id: 'expense-1',
        ticketId: 'ticket-1',
        name: 'Item 1',
        quantity: 2,
        price: 10.00,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'expense-2',
        ticketId: 'ticket-1',
        name: 'Item 2',
        quantity: 1,
        price: 30.00,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]

    render(
      <ExpenseTable
        ticketId="ticket-1"
        initialExpenses={expenses}
        editable={true}
      />
    )

    // Wait for any async operations to complete
    await waitFor(() => {
      // Total should be (2 * 10) + (1 * 30) = 50
      expect(screen.getByText(/\$50\.00/i)).toBeInTheDocument()
    })
  })
})


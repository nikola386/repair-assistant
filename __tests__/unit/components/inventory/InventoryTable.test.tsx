import { render, screen, fireEvent } from '@testing-library/react'
import InventoryTable from '@/components/inventory/InventoryTable'
import { useLanguage } from '@/contexts/LanguageContext'
import { showAlert } from '@/lib/alerts'
import { useConfirmation } from '@/lib/useConfirmation'

jest.mock('@/contexts/LanguageContext')
jest.mock('@/lib/alerts')
jest.mock('@/lib/useConfirmation')
jest.mock('@/components/inventory/InventoryForm', () => {
  return function MockInventoryForm({ onSubmit, onCancel }: any) {
    return (
      <div data-testid="inventory-form">
        <button onClick={() => onSubmit({})}>Submit</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})
jest.mock('@/components/ui/ConfirmationModal', () => {
  return function MockConfirmationModal({ isOpen, message, onConfirm, onCancel }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="confirmation-modal">
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>
const mockShowAlert = showAlert as jest.Mocked<typeof showAlert>
const mockUseConfirmation = useConfirmation as jest.MockedFunction<typeof useConfirmation>

describe('InventoryTable', () => {
  const mockItems = [
    {
      id: 'item-1',
      name: 'Screen Protector',
      sku: 'SP-001',
      category: 'Accessories',
      location: 'A1',
      currentQuantity: 10,
      minQuantity: 5,
      unitPrice: 15.99,
      costPrice: 10.00,
    },
    {
      id: 'item-2',
      name: 'Battery',
      sku: 'BAT-001',
      category: 'Parts',
      location: 'B2',
      currentQuantity: 2,
      minQuantity: 5,
      unitPrice: 25.00,
      costPrice: 15.00,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockUseLanguage.mockReturnValue({
      t: {
        inventory: {
          table: {
            noItems: 'No items found',
            editItem: 'Edit Item',
            updateSuccess: 'Item updated',
            updateError: 'Failed to update',
            quantityChangePlaceholder: 'Quantity change',
          },
          minQuantity: 'Min Quantity',
          unitPrice: 'Unit Price',
          lowStock: 'Low Stock',
          ok: 'OK',
          adjust: 'Adjust',
        },
        common: {
          fields: {
            name: 'Name',
            sku: 'SKU',
            category: 'Category',
            location: 'Location',
            quantity: 'Quantity',
            status: 'Status',
          },
          labels: {
            actions: 'Actions',
          },
          actions: {
            edit: 'Edit',
            delete: 'Delete',
            apply: 'Apply',
            cancel: 'Cancel',
          },
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
    mockUseConfirmation.mockReturnValue({
      confirm: jest.fn().mockResolvedValue(true),
      isOpen: false,
      message: '',
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    } as any)
  })

  it('should render inventory items', () => {
    render(<InventoryTable items={mockItems} editable={true} />)

    expect(screen.getByText('Screen Protector')).toBeInTheDocument()
    expect(screen.getByText('SP-001')).toBeInTheDocument()
    expect(screen.getByText('Battery')).toBeInTheDocument()
  })

  it('should display empty message when no items', () => {
    render(<InventoryTable items={[]} editable={true} />)

    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('should highlight low stock items', () => {
    const { container } = render(<InventoryTable items={mockItems} editable={true} />)

    const lowStockRow = container.querySelector('.inventory-table__row--low-stock')
    expect(lowStockRow).toBeInTheDocument()
  })

  it('should display low stock status', () => {
    render(<InventoryTable items={mockItems} editable={true} />)

    expect(screen.getByText('Low Stock')).toBeInTheDocument()
  })

  it('should not show actions column when not editable', () => {
    render(<InventoryTable items={mockItems} editable={false} />)

    expect(screen.queryByText('Actions')).not.toBeInTheDocument()
  })

  it('should format unit price correctly', () => {
    render(<InventoryTable items={mockItems} editable={true} />)

    expect(screen.getByText('$15.99')).toBeInTheDocument()
    expect(screen.getByText('$25.00')).toBeInTheDocument()
  })
})


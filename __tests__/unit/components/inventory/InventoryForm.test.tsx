import { render, screen } from '@testing-library/react'
import InventoryForm from '@/components/inventory/InventoryForm'
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
  inventory: {
    form: {
      name: 'Name',
      sku: 'SKU',
      description: 'Description',
      category: 'Category',
      location: 'Location',
      currentQuantity: 'Current Quantity',
      minQuantity: 'Minimum Quantity',
      unitPrice: 'Unit Price',
      costPrice: 'Cost Price',
      nameRequired: 'Name is required',
      quantityNonNegative: 'Quantity must be non-negative',
      minQuantityNonNegative: 'Minimum quantity must be non-negative',
      unitPriceNonNegative: 'Unit price must be non-negative',
      costPriceNonNegative: 'Cost price must be non-negative',
      updateError: 'Error updating item',
      createError: 'Error creating item',
      basicInformation: 'Basic Information',
      optional: 'Optional',
      optionalDescription: 'Optional description',
      organization: 'Organization',
      categoryPlaceholder: 'Select category',
      locationPlaceholder: 'Enter location',
      quantities: 'Quantities',
      minimumQuantity: 'Minimum Quantity',
      minimumQuantityHint: 'Alert when stock falls below this',
      pricing: 'Pricing',
      unitPriceLabel: 'Unit Price',
      costPriceLabel: 'Cost Price',
      addAnother: 'Add Another Item',
    },
  },
  common: {
    fields: {
      name: 'Name',
      sku: 'SKU',
      category: 'Category',
      location: 'Location',
    },
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      create: 'Create',
      update: 'Update',
    },
    messages: {
      updating: 'Updating...',
      creating: 'Creating...',
    },
  },
}

describe('InventoryForm', () => {
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

  it('should render form fields', () => {
    render(
      <InventoryForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/SKU/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Current Quantity/i)).toBeInTheDocument()
  })

  it('should populate form with initial data', () => {
    const initialData = {
      name: 'Test Item',
      sku: 'TEST-001',
      currentQuantity: 10,
    }

    render(
      <InventoryForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    )

    expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TEST-001')).toBeInTheDocument()
  })
})


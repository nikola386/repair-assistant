import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

describe('ConfirmationModal', () => {
  const mockOnConfirm = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={false}
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render when isOpen is true', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Test message')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should render with title', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Confirm Action"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
  })

  it('should call onConfirm when confirm button is clicked', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    expect(mockOnConfirm).toHaveBeenCalled()
  })

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should call onCancel when backdrop is clicked', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should call onCancel when Escape key is pressed', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const modal = screen.getByRole('dialog')
    fireEvent.keyDown(modal, { key: 'Escape' })

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should use custom button text', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        message="Test message"
        confirmText="Yes, delete"
        cancelText="No, keep"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Yes, delete')).toBeInTheDocument()
    expect(screen.getByText('No, keep')).toBeInTheDocument()
  })

  it('should apply variant classes', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        message="Test message"
        variant="danger"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const confirmButton = screen.getByText('Confirm')
    expect(confirmButton).toHaveClass('confirmation-modal__button--confirm--danger')
  })
})


import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from '@/components/ui/Pagination'

describe('Pagination', () => {
  const mockOnPageChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when totalPages is 1 or less', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render page numbers correctly', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />
    )

    expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to page 5')).toBeInTheDocument()
  })

  it('should call onPageChange when page number is clicked', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />
    )

    const page2Button = screen.getByLabelText('Go to page 2')
    fireEvent.click(page2Button)

    expect(mockOnPageChange).toHaveBeenCalledWith(2)
  })

  it('should disable previous button on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />
    )

    const prevButton = screen.getByLabelText('Previous page')
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={mockOnPageChange} />
    )

    const nextButton = screen.getByLabelText('Next page')
    expect(nextButton).toBeDisabled()
  })

  it('should show ellipsis for many pages', () => {
    render(
      <Pagination currentPage={5} totalPages={20} onPageChange={mockOnPageChange} />
    )

    // There may be multiple ellipsis, so use getAllByText
    const ellipsis = screen.getAllByText('...')
    expect(ellipsis.length).toBeGreaterThan(0)
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={10}
        onPageChange={mockOnPageChange}
        disabled={true}
      />
    )

    const pageButton = screen.getByLabelText('Go to page 4')
    expect(pageButton).toBeDisabled()
  })

  it('should highlight current page', () => {
    render(
      <Pagination currentPage={3} totalPages={10} onPageChange={mockOnPageChange} />
    )

    const currentPageButton = screen.getByLabelText('Go to page 3')
    expect(currentPageButton).toHaveClass('active')
    expect(currentPageButton).toHaveAttribute('aria-current', 'page')
  })
})


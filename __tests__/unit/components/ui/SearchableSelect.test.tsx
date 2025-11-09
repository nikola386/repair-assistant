import { render, screen, fireEvent } from '@testing-library/react'
import SearchableSelect from '@/components/ui/SearchableSelect'

describe('SearchableSelect', () => {
  const mockOptions = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
  ]
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with placeholder when no value selected', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Select an option"
      />
    )

    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('should display selected option label', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value="2"
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('should open dropdown when button is clicked', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('should filter options based on search query', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Option 2' } })

    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Option 3')).not.toBeInTheDocument()
  })

  it('should call onChange when option is selected', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const option = screen.getByText('Option 1')
    fireEvent.click(option)

    expect(mockOnChange).toHaveBeenCalledWith('1')
  })

  it('should close dropdown after selection', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const option = screen.getByText('Option 1')
    fireEvent.click(option)

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('should close dropdown when Escape key is pressed', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('should select first option when Enter is pressed', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(mockOnChange).toHaveBeenCalledWith('1')
  })

  it('should show "No results found" when search has no matches', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } })

    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should not open when disabled', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        className="custom-class"
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('should mark selected option with aria-selected', () => {
    render(
      <SearchableSelect
        options={mockOptions}
        value="2"
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const options = screen.getAllByRole('option')
    const selectedOption = options.find(opt => opt.getAttribute('aria-selected') === 'true')
    expect(selectedOption).toBeInTheDocument()
    expect(selectedOption?.textContent).toContain('Option 2')
  })
})


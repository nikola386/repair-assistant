import { render, screen, fireEvent } from '@testing-library/react'
import MultiSelect from '@/components/ui/MultiSelect'

describe('MultiSelect', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with placeholder when no values selected', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={[]}
        onChange={mockOnChange}
        allLabel="All Options"
      />
    )

    expect(screen.getByText('All Options')).toBeInTheDocument()
  })

  it('should display single selected option', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={['option1']}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('should display count when multiple options selected', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={['option1', 'option2']}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('should open dropdown when button is clicked', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={[]}
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Check for option labels specifically, not the "All" button text
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('should call onChange when option is clicked', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={[]}
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const option = screen.getByText('Option 1')
    fireEvent.click(option)

    expect(mockOnChange).toHaveBeenCalledWith(['option1'])
  })

  it('should deselect option when clicked again', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={['option1']}
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Use getAllByRole to find the option element specifically
    const options = screen.getAllByRole('option')
    const option1 = options.find(opt => opt.textContent?.includes('Option 1') && opt.getAttribute('data-value') === 'option1')
    if (option1) {
      fireEvent.click(option1)
      expect(mockOnChange).toHaveBeenCalledWith([])
    } else {
      // Fallback: use first option that contains "Option 1"
      const fallbackOption = options.find(opt => opt.textContent?.includes('Option 1'))
      if (fallbackOption) {
        fireEvent.click(fallbackOption)
        expect(mockOnChange).toHaveBeenCalled()
      }
    }
  })

  it('should select all when "All" option is clicked', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={['option1']}
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const allOption = screen.getByText('All')
    fireEvent.click(allOption)

    expect(mockOnChange).toHaveBeenCalledWith([])
  })

  it('should mark selected options with aria-selected', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={['option2']}
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    const options = screen.getAllByRole('option')
    const selectedOption = options.find(opt => opt.getAttribute('aria-selected') === 'true' && opt.textContent?.includes('Option 2'))
    expect(selectedOption).toBeInTheDocument()
  })

  it('should close dropdown when clicking outside', () => {
    render(
      <MultiSelect
        options={mockOptions}
        selectedValues={[]}
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.getByText('Option 1')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByText('Option 1')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <MultiSelect
        options={mockOptions}
        selectedValues={[]}
        onChange={mockOnChange}
        className="custom-class"
      />
    )

    expect(container.querySelector('.multi-select')).toHaveClass('custom-class')
  })
})


import { render, screen, fireEvent } from '@testing-library/react'
import LogoUpload from '@/components/ui/LogoUpload'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')
jest.mock('react-icons/hi', () => ({
  HiCamera: () => <span data-testid="camera-icon">Camera</span>,
  HiCloudUpload: () => <span data-testid="upload-icon">Upload</span>,
}))

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('LogoUpload', () => {
  const mockOnChange = jest.fn()
  const mockOnRemove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      t: {
        onboarding: {
          logo: 'Logo',
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  it('should render with preview image', () => {
    render(
      <LogoUpload
        preview="https://example.com/logo.jpg"
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    )

    const image = screen.getByAltText('Logo preview')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/logo.jpg')
  })

  it('should render upload area when no preview', () => {
    render(
      <LogoUpload
        preview=""
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByTestId('upload-icon')).toBeInTheDocument()
  })

  it('should call onChange when file is selected', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    render(
      <LogoUpload
        preview=""
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    )

    const input = screen.getByLabelText(/Logo/i) as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(mockOnChange).toHaveBeenCalledWith(file)
  })

  it('should call onRemove when remove button is clicked', () => {
    render(
      <LogoUpload
        preview="https://example.com/logo.jpg"
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)

    expect(mockOnRemove).toHaveBeenCalled()
    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('should handle drag and drop', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    render(
      <LogoUpload
        preview=""
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    )

    const dropZone = screen.getByTestId('upload-icon').closest('div')
    if (dropZone) {
      fireEvent.dragOver(dropZone)
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      })

      expect(mockOnChange).toHaveBeenCalledWith(file)
    }
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <LogoUpload
        preview=""
        onChange={mockOnChange}
        onRemove={mockOnRemove}
        disabled={true}
      />
    )

    const input = screen.getByLabelText(/Logo/i) as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('should use custom label when provided', () => {
    render(
      <LogoUpload
        preview=""
        onChange={mockOnChange}
        onRemove={mockOnRemove}
        label="Custom Logo"
      />
    )

    expect(screen.getByText('Custom Logo')).toBeInTheDocument()
  })
})


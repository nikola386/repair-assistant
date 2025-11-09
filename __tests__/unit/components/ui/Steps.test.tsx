import { render, screen } from '@testing-library/react'
import Steps from '@/components/ui/Steps'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('Steps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      t: {},
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  const mockSteps = [
    { number: 1, title: 'Step 1', description: 'First step' },
    { number: 2, title: 'Step 2', description: 'Second step' },
    { number: 3, title: 'Step 3' },
  ]

  it('should render all steps', () => {
    render(<Steps steps={mockSteps} currentStep={1} />)

    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    expect(screen.getByText('Step 3')).toBeInTheDocument()
  })

  it('should mark current step as active', () => {
    const { container } = render(<Steps steps={mockSteps} currentStep={2} />)

    const step2 = container.querySelector('.step-circle.active')
    expect(step2).toBeInTheDocument()
    expect(step2?.textContent).toContain('2')
  })

  it('should mark completed steps with checkmark', () => {
    const { container } = render(<Steps steps={mockSteps} currentStep={3} />)

    const step1 = container.querySelector('.step-circle.completed')
    expect(step1).toBeInTheDocument()
    expect(step1?.querySelector('svg')).toBeInTheDocument()
  })

  it('should display step descriptions when provided', () => {
    render(<Steps steps={mockSteps} currentStep={1} />)

    expect(screen.getByText('First step')).toBeInTheDocument()
    expect(screen.getByText('Second step')).toBeInTheDocument()
  })

  it('should not display description when not provided', () => {
    render(<Steps steps={mockSteps} currentStep={1} />)

    const step3 = screen.getByText('Step 3').closest('.step-item')
    expect(step3?.querySelector('.step-description')).not.toBeInTheDocument()
  })

  it('should render step numbers correctly', () => {
    render(<Steps steps={mockSteps} currentStep={1} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should apply active class to current step title', () => {
    const { container } = render(<Steps steps={mockSteps} currentStep={2} />)

    const activeTitle = container.querySelector('.step-title.active')
    expect(activeTitle).toBeInTheDocument()
    expect(activeTitle?.textContent).toBe('Step 2')
  })
})


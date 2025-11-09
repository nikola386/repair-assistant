import { render, screen } from '@testing-library/react'
import CookieBanner from '@/components/ui/CookieBanner'
import { useLanguage } from '@/contexts/LanguageContext'

jest.mock('@/contexts/LanguageContext')
jest.mock('react-cookie-consent', () => {
  return function MockCookieConsent({ children, buttonText, declineButtonText, onAccept, onDecline }: any) {
    return (
      <div data-testid="cookie-consent">
        <div>{children}</div>
        <button onClick={onAccept}>{buttonText}</button>
        <button onClick={onDecline}>{declineButtonText}</button>
      </div>
    )
  }
})

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>

describe('CookieBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      t: {
        cookies: {
          accept: 'Accept',
          decline: 'Decline',
          message: 'We use cookies to enhance your experience.',
        },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
  })

  it('should render cookie banner with message', () => {
    render(<CookieBanner />)

    expect(screen.getByText('We use cookies to enhance your experience.')).toBeInTheDocument()
  })

  it('should render accept button', () => {
    render(<CookieBanner />)

    expect(screen.getByText('Accept')).toBeInTheDocument()
  })

  it('should render decline button', () => {
    render(<CookieBanner />)

    expect(screen.getByText('Decline')).toBeInTheDocument()
  })

  it('should call onAccept when accept button is clicked', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    render(<CookieBanner />)

    const acceptButton = screen.getByText('Accept')
    acceptButton.click()

    expect(consoleSpy).toHaveBeenCalledWith('Cookies accepted')
    consoleSpy.mockRestore()
  })

  it('should call onDecline when decline button is clicked', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    render(<CookieBanner />)

    const declineButton = screen.getByText('Decline')
    declineButton.click()

    expect(consoleSpy).toHaveBeenCalledWith('Cookies declined')
    consoleSpy.mockRestore()
  })
})


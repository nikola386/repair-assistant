import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileDropdown from '@/components/ui/ProfileDropdown'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

jest.mock('@/contexts/LanguageContext')
jest.mock('next-auth/react')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('ProfileDropdown', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLanguage.mockReturnValue({
      t: {
        profile: { menu: 'Profile menu' },
        settings: { title: 'Settings' },
        auth: { logout: 'Logout' },
      },
      language: 'en',
      setLanguage: jest.fn(),
    } as any)
    mockUseRouter.mockReturnValue(mockRouter as any)
    mockSignOut.mockImplementation(() => Promise.resolve())
  })

  it('should render user name when available', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      status: 'authenticated',
    } as any)

    render(<ProfileDropdown />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should render user email when name is not available', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'john@example.com',
        },
      },
      status: 'authenticated',
    } as any)

    render(<ProfileDropdown />)

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should display user initials when no profile image', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      status: 'authenticated',
    } as any)

    const { container } = render(<ProfileDropdown />)

    const placeholder = container.querySelector('.profile-dropdown__avatar-placeholder')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder?.textContent).toBe('JD')
  })

  it('should display profile image when available', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      },
      status: 'authenticated',
    } as any)

    render(<ProfileDropdown />)

    const image = screen.getByAltText('John Doe')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('should open dropdown when button is clicked', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      status: 'authenticated',
    } as any)

    render(<ProfileDropdown />)

    const button = screen.getByLabelText('Profile menu')
    fireEvent.click(button)

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('should close dropdown when clicking outside', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      status: 'authenticated',
    } as any)

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ProfileDropdown />
      </div>
    )

    const button = screen.getByLabelText('Profile menu')
    fireEvent.click(button)

    expect(screen.getByText('Settings')).toBeInTheDocument()

    const outside = screen.getByTestId('outside')
    fireEvent.mouseDown(outside)

    waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })

  it('should call signOut when logout is clicked', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      status: 'authenticated',
    } as any)

    render(<ProfileDropdown />)

    const button = screen.getByLabelText('Profile menu')
    fireEvent.click(button)

    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })

  it('should close dropdown when settings link is clicked', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      status: 'authenticated',
    } as any)

    render(<ProfileDropdown />)

    const button = screen.getByLabelText('Profile menu')
    fireEvent.click(button)

    const settingsLink = screen.getByText('Settings')
    fireEvent.click(settingsLink)

    waitFor(() => {
      expect(screen.queryByText('Logout')).not.toBeInTheDocument()
    })
  })
})


import { render, screen, waitFor } from '@testing-library/react'
import ProtectedRoutes from '@/components/ProtectedRoutes'
import { useSession } from 'next-auth/react'
import { checkPermission } from '@/lib/permissionsCache'

jest.mock('@/lib/permissionsCache')

// Mock fetch globally
global.fetch = jest.fn((url: string) => {
  if (url === '/api/users/me') {
    return Promise.resolve({
      json: () => Promise.resolve({ isActive: true }),
    })
  }
  if (url === '/api/onboarding') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ isComplete: true }),
    })
  }
  return Promise.resolve({
    json: () => Promise.resolve({}),
  })
}) as jest.Mock

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Get the mocked useSession from next-auth/react
const { useSession: mockUseSession } = require('next-auth/react')
const mockCheckPermission = checkPermission as jest.MockedFunction<typeof checkPermission>

describe('ProtectedRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when authenticated and has permission', async () => {
    ;(mockUseSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      },
      status: 'authenticated',
    })
    mockCheckPermission.mockResolvedValue(true)
    
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/users/me') {
        return Promise.resolve({
          json: () => Promise.resolve({ isActive: true }),
        })
      }
      if (url === '/api/onboarding') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isComplete: true }),
        })
      }
      return Promise.resolve({
        json: () => Promise.resolve({}),
      })
    })

    render(
      <ProtectedRoutes permission="VIEW_TICKETS">
        <div>Protected Content</div>
      </ProtectedRoutes>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('should show spinner when loading', () => {
    ;(mockUseSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    })

    render(
      <ProtectedRoutes>
        <div>Content</div>
      </ProtectedRoutes>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should redirect when not authenticated', () => {
    ;(mockUseSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const { container } = render(
      <ProtectedRoutes>
        <div>Content</div>
      </ProtectedRoutes>
    )

    // Should not render content
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })
})


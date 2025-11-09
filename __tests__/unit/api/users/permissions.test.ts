import { GET } from '@/app/api/users/permissions/route'
import { NextRequest } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { getUserPermissions } from '@/lib/permission-helpers'
import { createMockNextRequest, createMockSession } from '../../../utils/test-helpers'

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/permission-helpers')

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockGetUserPermissions = getUserPermissions as jest.MockedFunction<typeof getUserPermissions>

describe('/api/users/permissions - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return all permissions when no permission param provided', async () => {
    const mockSession = createMockSession()
    const mockPermissions = [Permission.VIEW_TICKETS, Permission.EDIT_TICKETS]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockGetUserPermissions.mockResolvedValue(mockPermissions)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.permissions).toEqual(mockPermissions)
    expect(mockGetUserPermissions).toHaveBeenCalledWith(mockSession.user.id)
  })

  it('should return hasPermission true when user has the permission', async () => {
    const mockSession = createMockSession()
    const mockPermissions = [Permission.VIEW_TICKETS, Permission.EDIT_TICKETS]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockGetUserPermissions.mockResolvedValue(mockPermissions)

    const url = new URL('http://localhost:3001/api/users/permissions')
    url.searchParams.set('permission', Permission.VIEW_TICKETS)
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hasPermission).toBe(true)
  })

  it('should return hasPermission false when user does not have the permission', async () => {
    const mockSession = createMockSession()
    const mockPermissions = [Permission.VIEW_TICKETS]

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockGetUserPermissions.mockResolvedValue(mockPermissions)

    const url = new URL('http://localhost:3001/api/users/permissions')
    url.searchParams.set('permission', Permission.EDIT_TICKETS)
    const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hasPermission).toBe(false)
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})


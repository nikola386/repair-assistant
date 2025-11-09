import { GET } from '@/app/api/countries/route'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createMockNextRequest } from '../../../utils/test-helpers'

jest.mock('@/lib/db', () => ({
  db: {
    country: {
      findMany: jest.fn(),
    },
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('/api/countries - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return countries list successfully', async () => {
    const mockCountries = [
      { id: '1', name: 'United States', code: 'US' },
      { id: '2', name: 'United Kingdom', code: 'GB' },
      { id: '3', name: 'Germany', code: 'DE' },
    ]

    mockDb.country.findMany.mockResolvedValue(mockCountries as any)

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.countries).toEqual(mockCountries)
    expect(mockDb.country.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    })
  })

  it('should return empty array when no countries exist', async () => {
    mockDb.country.findMany.mockResolvedValue([])

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.countries).toEqual([])
  })

  it('should return 500 when an error occurs', async () => {
    mockDb.country.findMany.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})


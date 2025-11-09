jest.mock('react', () => ({
  ...jest.requireActual('react'),
  createElement: jest.fn((type, props, ...children) => {
    return { type, props, children }
  }),
}))

jest.mock('@/lib/api-middleware')
jest.mock('@/lib/ticketStorage')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: jest.fn(),
    },
  },
}))
jest.mock('@/lib/settingsStorage')
jest.mock('@/lib/pdfFonts', () => ({
  ensurePdfFontsRegistered: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/pdfTranslations', () => ({
  getPdfTranslations: jest.fn(() => ({ invoice: { title: 'Invoice' } })),
}))
jest.mock('@/lib/languages', () => ({
  isValidLanguage: jest.fn((lang) => ['en', 'bg'].includes(lang)),
}))
// Mock renderToBuffer to always succeed, catching any errors
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(async () => {
    // Always return a buffer, regardless of input
    return Buffer.from('mock-pdf-content')
  }),
}))
jest.mock('@/components/reports/InvoicePDF', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
}))

import { GET } from '@/app/api/tickets/[id]/invoice/route'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { settingsStorage } from '@/lib/settingsStorage'
import { createMockNextRequest, createMockSession, createMockUser, createMockTicket } from '../../../../../utils/test-helpers'

const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>
const mockTicketStorage = ticketStorage as jest.Mocked<typeof ticketStorage>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockDb = db as jest.Mocked<typeof db>
const mockSettingsStorage = settingsStorage as jest.Mocked<typeof settingsStorage>

describe('/api/tickets/[id]/invoice - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate invoice PDF successfully', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = { ...createMockTicket(), expenses: [] }
    const mockStore = {
      id: 'store-1',
      name: 'Test Store',
      address: '123 Test St',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US',
      phone: '123-456-7890',
      email: 'store@test.com',
      website: 'https://test.com',
      vatNumber: 'VAT123',
      currency: 'USD',
      logo: null,
      taxEnabled: true,
      taxRate: 10,
      taxInclusive: false,
    }
    const mockSettings = {
      id: 'settings-1',
      storeId: 'store-1',
      language: 'en',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockSettingsStorage.findByStoreId.mockResolvedValue(mockSettings as any)

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('invoice-')
    expect(mockTicketStorage.getById).toHaveBeenCalledWith('test-ticket-id', mockUser.storeId)
    expect(mockDb.store.findUnique).toHaveBeenCalled()
  })

  it('should return 404 when user store not found', async () => {
    const mockSession = createMockSession()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User store not found')
  })

  it('should return 404 when ticket not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'non-existent-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Ticket not found')
  })

  it('should return 404 when store not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = { ...createMockTicket(), expenses: [] }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
    mockDb.store.findUnique.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Store not found')
  })

  it('should load expenses if not present on ticket', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = { ...createMockTicket(), expenses: undefined }
    const mockStore = {
      id: 'store-1',
      name: 'Test Store',
      address: '123 Test St',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US',
      phone: '123-456-7890',
      email: 'store@test.com',
      website: 'https://test.com',
      vatNumber: 'VAT123',
      currency: 'USD',
      logo: null,
      taxEnabled: true,
      taxRate: 10,
      taxInclusive: false,
    }
    const mockExpenses = [
      { id: 'expense-1', description: 'Part replacement', amount: 50 },
    ]
    const mockSettings = {
      id: 'settings-1',
      storeId: 'store-1',
      language: 'en',
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockTicketStorage.getExpensesByTicketId.mockResolvedValue(mockExpenses as any)
    mockSettingsStorage.findByStoreId.mockResolvedValue(mockSettings as any)

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })

    expect(response.status).toBe(200)
    expect(mockTicketStorage.getExpensesByTicketId).toHaveBeenCalledWith(mockTicket.id)
  })

  it('should use default language when settings not found', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()
    const mockTicket = { ...createMockTicket(), expenses: [] }
    const mockStore = {
      id: 'store-1',
      name: 'Test Store',
      address: '123 Test St',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US',
      phone: '123-456-7890',
      email: 'store@test.com',
      website: 'https://test.com',
      vatNumber: 'VAT123',
      currency: 'USD',
      logo: null,
      taxEnabled: true,
      taxRate: 10,
      taxInclusive: false,
    }

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockResolvedValue(mockTicket as any)
    mockDb.store.findUnique.mockResolvedValue(mockStore as any)
    mockSettingsStorage.findByStoreId.mockResolvedValue(null)

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })

    expect(response.status).toBe(200)
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuthAndPermission.mockResolvedValue({
      session: null,
      response: { status: 401 } as any,
    })

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })

    expect(response.status).toBe(401)
  })

  it('should return 500 when an error occurs', async () => {
    const mockSession = createMockSession()
    const mockUser = createMockUser()

    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
    mockTicketStorage.getById.mockRejectedValue(new Error('Database error'))

    const request = createMockNextRequest()
    const params = { id: 'test-ticket-id' }
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to generate invoice')
  })
})

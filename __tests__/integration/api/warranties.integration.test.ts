/**
 * Integration tests for Warranties API
 * These tests verify the full flow of API endpoints working together
 */

import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/warranties/[id]/route'
import { GET as GET_CLAIMS, POST as POST_CLAIM } from '@/app/api/warranties/claims/route'
import { GET as GET_CLAIM_BY_ID, PATCH as PATCH_CLAIM } from '@/app/api/warranties/claims/[id]/route'
import { GET as GET_EXPIRING } from '@/app/api/warranties/expiring/route'
import { NextRequest } from 'next/server'
import { warrantyStorage } from '@/lib/warrantyStorage'
import { userStorage } from '@/lib/userStorage'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { createMockNextRequest, createMockSession, createMockUser } from '../../utils/test-helpers'

// Mock dependencies
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: jest.fn().mockResolvedValue(body),
      headers: new Headers(init?.headers || {}),
    })),
  },
}))
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))
jest.mock('next-auth/providers/credentials', () => ({
  CredentialsProvider: jest.fn(),
}))
jest.mock('@/lib/auth.config', () => ({
  authOptions: {},
}))
jest.mock('@/lib/warrantyStorage')
jest.mock('@/lib/userStorage')
jest.mock('@/lib/api-middleware')
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
}))

const mockWarrantyStorage = warrantyStorage as jest.Mocked<typeof warrantyStorage>
const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>
const mockRequireAuthAndPermission = requireAuthAndPermission as jest.MockedFunction<typeof requireAuthAndPermission>

const createMockWarranty = (overrides = {}) => ({
  id: 'test-warranty-id',
  ticketId: 'test-ticket-id',
  storeId: 'test-store-id',
  customerId: 'test-customer-id',
  warrantyPeriodDays: 30,
  startDate: '2024-01-01',
  expiryDate: '2024-01-31',
  warrantyType: 'both' as const,
  status: 'active' as const,
  terms: 'Standard warranty terms',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockWarrantyClaim = (overrides = {}) => ({
  id: 'test-claim-id',
  warrantyId: 'test-warranty-id',
  storeId: 'test-store-id',
  issueDescription: 'Device stopped working',
  claimDate: new Date().toISOString(),
  status: 'pending' as const,
  resolutionNotes: null,
  resolutionDate: null,
  relatedTicketId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('Warranties API Integration', () => {
  const mockSession = createMockSession()
  const mockUser = createMockUser()

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuthAndPermission.mockResolvedValue({
      session: mockSession as any,
      response: null,
    })
    mockUserStorage.findById.mockResolvedValue(mockUser as any)
  })

  describe('Warranty [id] Route', () => {
    describe('GET /api/warranties/[id]', () => {
      it('should retrieve a warranty by ID', async () => {
        const warranty = createMockWarranty({ id: 'warranty-1' })
        mockWarrantyStorage.getById.mockResolvedValue(warranty as any)

        const request = createMockNextRequest()
        const response = await GET_BY_ID(request, { params: { id: 'warranty-1' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.warranty.id).toBe('warranty-1')
        expect(mockWarrantyStorage.getById).toHaveBeenCalledWith('warranty-1', mockUser.storeId)
      })

      it('should return 404 when warranty not found', async () => {
        mockWarrantyStorage.getById.mockResolvedValue(null as any)

        const request = createMockNextRequest()
        const response = await GET_BY_ID(request, { params: { id: 'non-existent' } })

        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toBe('Warranty not found')
      })
    })

    describe('PATCH /api/warranties/[id]', () => {
      it('should update a warranty', async () => {
        const updatedWarranty = createMockWarranty({
          id: 'warranty-1',
          status: 'expired',
          warrantyType: 'parts',
          notes: 'Updated notes',
        })
        mockWarrantyStorage.update.mockResolvedValue(updatedWarranty as any)

        const request = createMockNextRequest({
          method: 'PATCH',
          json: jest.fn().mockResolvedValue({
            status: 'expired',
            warrantyType: 'parts',
            notes: 'Updated notes',
          }),
        })
        const response = await PATCH(request, { params: { id: 'warranty-1' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.warranty.status).toBe('expired')
        expect(data.warranty.warrantyType).toBe('parts')
        expect(data.warranty.notes).toBe('Updated notes')
        expect(data.message).toBe('Warranty updated successfully')
      })

      it('should return 404 when warranty not found for update', async () => {
        mockWarrantyStorage.update.mockResolvedValue(null as any)

        const request = createMockNextRequest({
          method: 'PATCH',
          json: jest.fn().mockResolvedValue({ status: 'expired' }),
        })
        const response = await PATCH(request, { params: { id: 'non-existent' } })

        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toBe('Warranty not found')
      })

      it('should ignore invalid status values', async () => {
        const warranty = createMockWarranty({ id: 'warranty-1' })
        mockWarrantyStorage.update.mockResolvedValue(warranty as any)

        const request = createMockNextRequest({
          method: 'PATCH',
          json: jest.fn().mockResolvedValue({
            status: 'invalid_status',
            warrantyPeriodDays: 60,
          }),
        })
        const response = await PATCH(request, { params: { id: 'warranty-1' } })

        expect(response.status).toBe(200)
        // Invalid status should be filtered out, only warrantyPeriodDays should be updated
        expect(mockWarrantyStorage.update).toHaveBeenCalledWith(
          'warranty-1',
          expect.objectContaining({
            warrantyPeriodDays: 60,
          }),
          mockUser.storeId
        )
      })
    })

    describe('DELETE /api/warranties/[id]', () => {
      it('should void a warranty', async () => {
        const voidedWarranty = createMockWarranty({
          id: 'warranty-1',
          status: 'voided',
        })
        mockWarrantyStorage.voidWarranty.mockResolvedValue(voidedWarranty as any)

        const request = createMockNextRequest({ method: 'DELETE' })
        const response = await DELETE(request, { params: { id: 'warranty-1' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.warranty.status).toBe('voided')
        expect(data.message).toBe('Warranty voided successfully')
        expect(mockWarrantyStorage.voidWarranty).toHaveBeenCalledWith('warranty-1', mockUser.storeId)
      })

      it('should return 404 when warranty not found for void', async () => {
        mockWarrantyStorage.voidWarranty.mockResolvedValue(null as any)

        const request = createMockNextRequest({ method: 'DELETE' })
        const response = await DELETE(request, { params: { id: 'non-existent' } })

        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toBe('Warranty not found')
      })
    })
  })

  describe('Warranty Claims Route', () => {
    describe('GET /api/warranties/claims', () => {
      it('should retrieve all warranty claims', async () => {
        const claims = [
          createMockWarrantyClaim({ id: 'claim-1', status: 'pending' }),
          createMockWarrantyClaim({ id: 'claim-2', status: 'approved' }),
        ]
        mockWarrantyStorage.getAllClaims.mockResolvedValue(claims as any)

        const request = createMockNextRequest()
        const response = await GET_CLAIMS(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.claims).toHaveLength(2)
        expect(mockWarrantyStorage.getAllClaims).toHaveBeenCalledWith(mockUser.storeId, undefined)
      })

      it('should filter claims by status', async () => {
        const pendingClaims = [createMockWarrantyClaim({ id: 'claim-1', status: 'pending' })]
        mockWarrantyStorage.getAllClaims.mockResolvedValue(pendingClaims as any)

        const url = new URL('http://localhost:3001/api/warranties/claims?status=pending')
        const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
        const response = await GET_CLAIMS(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.claims).toHaveLength(1)
        expect(data.claims[0].status).toBe('pending')
        expect(mockWarrantyStorage.getAllClaims).toHaveBeenCalledWith(mockUser.storeId, 'pending')
      })
    })

    describe('POST /api/warranties/claims', () => {
      it('should create a warranty claim', async () => {
        const newClaim = createMockWarrantyClaim({
          id: 'new-claim-id',
          warrantyId: 'warranty-1',
        })
        mockWarrantyStorage.createClaim.mockResolvedValue(newClaim as any)

        const claimData = {
          warrantyId: 'warranty-1',
          issueDescription: 'Device stopped working',
        }

        const request = createMockNextRequest({
          method: 'POST',
          json: jest.fn().mockResolvedValue(claimData),
        })
        const response = await POST_CLAIM(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.claim.id).toBe('new-claim-id')
        expect(data.claim.issueDescription).toBe('Device stopped working')
        expect(data.message).toBe('Warranty claim created successfully')
        expect(mockWarrantyStorage.createClaim).toHaveBeenCalled()
      })

      it('should return 400 when required fields are missing', async () => {
        const request = createMockNextRequest({
          method: 'POST',
          json: jest.fn().mockResolvedValue({
            warrantyId: 'warranty-1',
            // Missing issueDescription
          }),
        })
        const response = await POST_CLAIM(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Missing required fields')
        expect(mockWarrantyStorage.createClaim).not.toHaveBeenCalled()
      })
    })
  })

  describe('Warranty Claim [id] Route', () => {
    describe('GET /api/warranties/claims/[id]', () => {
      it('should retrieve a warranty claim by ID', async () => {
        const claim = createMockWarrantyClaim({ id: 'claim-1' })
        mockWarrantyStorage.getClaimById.mockResolvedValue(claim as any)

        const request = createMockNextRequest()
        const response = await GET_CLAIM_BY_ID(request, { params: { id: 'claim-1' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.claim.id).toBe('claim-1')
        expect(mockWarrantyStorage.getClaimById).toHaveBeenCalledWith('claim-1', mockUser.storeId)
      })

      it('should return 404 when claim not found', async () => {
        mockWarrantyStorage.getClaimById.mockResolvedValue(null as any)

        const request = createMockNextRequest()
        const response = await GET_CLAIM_BY_ID(request, { params: { id: 'non-existent' } })

        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toBe('Warranty claim not found')
      })
    })

    describe('PATCH /api/warranties/claims/[id]', () => {
      it('should update a warranty claim', async () => {
        const updatedClaim = createMockWarrantyClaim({
          id: 'claim-1',
          status: 'approved',
          resolutionNotes: 'Approved for repair',
          resolutionDate: new Date().toISOString(),
        })
        mockWarrantyStorage.updateClaim.mockResolvedValue(updatedClaim as any)

        const request = createMockNextRequest({
          method: 'PATCH',
          json: jest.fn().mockResolvedValue({
            status: 'approved',
            resolutionNotes: 'Approved for repair',
            resolutionDate: new Date().toISOString(),
          }),
        })
        const response = await PATCH_CLAIM(request, { params: { id: 'claim-1' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.claim.status).toBe('approved')
        expect(data.claim.resolutionNotes).toBe('Approved for repair')
        expect(data.message).toBe('Warranty claim updated successfully')
      })

      it('should return 404 when claim not found for update', async () => {
        mockWarrantyStorage.updateClaim.mockResolvedValue(null as any)

        const request = createMockNextRequest({
          method: 'PATCH',
          json: jest.fn().mockResolvedValue({ status: 'approved' }),
        })
        const response = await PATCH_CLAIM(request, { params: { id: 'non-existent' } })

        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toBe('Warranty claim not found')
      })

      it('should ignore invalid status values', async () => {
        const claim = createMockWarrantyClaim({ id: 'claim-1' })
        mockWarrantyStorage.updateClaim.mockResolvedValue(claim as any)

        const request = createMockNextRequest({
          method: 'PATCH',
          json: jest.fn().mockResolvedValue({
            status: 'invalid_status',
            resolutionNotes: 'Some notes',
          }),
        })
        const response = await PATCH_CLAIM(request, { params: { id: 'claim-1' } })

        expect(response.status).toBe(200)
        // Invalid status should be filtered out, only resolutionNotes should be updated
        expect(mockWarrantyStorage.updateClaim).toHaveBeenCalledWith(
          'claim-1',
          expect.objectContaining({
            resolutionNotes: 'Some notes',
          }),
          mockUser.storeId
        )
      })
    })
  })

  describe('Expiring Warranties Route', () => {
    describe('GET /api/warranties/expiring', () => {
      it('should retrieve expiring warranties with default 30 days', async () => {
        const expiringWarranties = [
          createMockWarranty({ id: 'warranty-1', expiryDate: '2024-02-01' }),
          createMockWarranty({ id: 'warranty-2', expiryDate: '2024-02-15' }),
        ]
        mockWarrantyStorage.getActiveWarranties.mockResolvedValue(expiringWarranties as any)

        const request = createMockNextRequest()
        const response = await GET_EXPIRING(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.warranties).toHaveLength(2)
        expect(mockWarrantyStorage.getActiveWarranties).toHaveBeenCalledWith(mockUser.storeId, 30)
      })

      it('should retrieve expiring warranties with custom days parameter', async () => {
        const expiringWarranties = [
          createMockWarranty({ id: 'warranty-1', expiryDate: '2024-02-01' }),
        ]
        mockWarrantyStorage.getActiveWarranties.mockResolvedValue(expiringWarranties as any)

        const url = new URL('http://localhost:3001/api/warranties/expiring?days=60')
        const request = createMockNextRequest({ url: url.toString(), nextUrl: url })
        const response = await GET_EXPIRING(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.warranties).toHaveLength(1)
        expect(mockWarrantyStorage.getActiveWarranties).toHaveBeenCalledWith(mockUser.storeId, 60)
      })

      it('should handle empty expiring warranties list', async () => {
        mockWarrantyStorage.getActiveWarranties.mockResolvedValue([])

        const request = createMockNextRequest()
        const response = await GET_EXPIRING(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.warranties).toHaveLength(0)
      })
    })
  })

  describe('Full Warranty Workflow', () => {
    it('should create a claim, update it, and retrieve it', async () => {
      // Create claim
      const newClaim = createMockWarrantyClaim({
        id: 'workflow-claim-id',
        warrantyId: 'warranty-1',
        status: 'pending',
      })
      mockWarrantyStorage.createClaim.mockResolvedValue(newClaim as any)

      const createRequest = createMockNextRequest({
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          warrantyId: 'warranty-1',
          issueDescription: 'Device issue',
        }),
      })
      const createResponse = await POST_CLAIM(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(201)
      expect(createData.claim.id).toBe('workflow-claim-id')

      // Update claim
      const updatedClaim = createMockWarrantyClaim({
        id: 'workflow-claim-id',
        status: 'approved',
        resolutionNotes: 'Fixed',
      })
      mockWarrantyStorage.updateClaim.mockResolvedValue(updatedClaim as any)

      const updateRequest = createMockNextRequest({
        method: 'PATCH',
        json: jest.fn().mockResolvedValue({
          status: 'approved',
          resolutionNotes: 'Fixed',
        }),
      })
      const updateResponse = await PATCH_CLAIM(updateRequest, { params: { id: 'workflow-claim-id' } })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updateData.claim.status).toBe('approved')

      // Retrieve claim
      mockWarrantyStorage.getClaimById.mockResolvedValue(updatedClaim as any)
      const getRequest = createMockNextRequest()
      const getResponse = await GET_CLAIM_BY_ID(getRequest, { params: { id: 'workflow-claim-id' } })
      const getData = await getResponse.json()

      expect(getResponse.status).toBe(200)
      expect(getData.claim.status).toBe('approved')
      expect(getData.claim.resolutionNotes).toBe('Fixed')
    })
  })
})


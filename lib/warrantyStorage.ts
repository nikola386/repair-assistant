import { Warranty, WarrantyClaim, CreateWarrantyInput, UpdateWarrantyInput, CreateWarrantyClaimInput, UpdateWarrantyClaimInput, WarrantyStatus, WarrantyClaimStatus } from '../types/warranty'
import { db } from './db'
import type { Warranty as PrismaWarranty, WarrantyClaim as PrismaWarrantyClaim } from '@prisma/client'

export interface WarrantyFilters {
  search?: string
  status?: string // Can be comma-separated
  page?: number
  limit?: number
}

export interface PaginatedWarrantyResponse {
  warranties: Warranty[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Map Prisma Warranty to domain Warranty
const mapPrismaWarranty = (warranty: PrismaWarranty & { ticket?: any; customer?: any; warrantyClaims?: PrismaWarrantyClaim[] }): Warranty => {
  return {
    id: warranty.id,
    ticketId: warranty.ticketId,
    storeId: warranty.storeId,
    customerId: warranty.customerId,
    warrantyPeriodDays: warranty.warrantyPeriodDays,
    startDate: warranty.startDate.toISOString().split('T')[0],
    expiryDate: warranty.expiryDate.toISOString().split('T')[0],
    warrantyType: warranty.warrantyType as 'parts' | 'labor' | 'both',
    status: warranty.status as WarrantyStatus,
    terms: warranty.terms ?? undefined,
    notes: warranty.notes ?? undefined,
    createdAt: warranty.createdAt.toISOString(),
    updatedAt: warranty.updatedAt.toISOString(),
    ticket: warranty.ticket,
    customer: warranty.customer,
    warrantyClaims: warranty.warrantyClaims?.map(mapPrismaWarrantyClaim),
  }
}

// Map Prisma WarrantyClaim to domain WarrantyClaim
const mapPrismaWarrantyClaim = (claim: PrismaWarrantyClaim): WarrantyClaim => {
  return {
    id: claim.id,
    warrantyId: claim.warrantyId,
    storeId: claim.storeId,
    issueDescription: claim.issueDescription,
    claimDate: claim.claimDate.toISOString().split('T')[0],
    status: claim.status as WarrantyClaimStatus,
    resolutionNotes: claim.resolutionNotes ?? undefined,
    resolutionDate: claim.resolutionDate ? claim.resolutionDate.toISOString().split('T')[0] : undefined,
    relatedTicketId: claim.relatedTicketId ?? undefined,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
  }
}

// Auto-update warranty status based on expiry date
const updateWarrantyStatus = async (warranty: PrismaWarranty): Promise<void> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiryDate = new Date(warranty.expiryDate)
  expiryDate.setHours(0, 0, 0, 0)

  // Only update if currently active and expired
  if (warranty.status === 'active' && expiryDate < today) {
    await db.warranty.update({
      where: { id: warranty.id },
      data: { status: 'expired' },
    })
  }
}

export const warrantyStorage = {
  create: async (input: CreateWarrantyInput, storeId: string): Promise<Warranty> => {
    try {
      // Get ticket to ensure it exists and belongs to store
      const ticket = await db.repairTicket.findFirst({
        where: {
          id: input.ticketId,
          storeId,
        },
        include: {
          customer: true,
        },
      })

      if (!ticket) {
        throw new Error('Ticket not found or does not belong to this store')
      }

      // Check if warranty already exists for this ticket
      const existing = await db.warranty.findUnique({
        where: { ticketId: input.ticketId },
      })

      if (existing) {
        throw new Error('Warranty already exists for this ticket')
      }

      // Get default warranty period from settings or use 30 days
      const settings = await db.settings.findUnique({
        where: { storeId },
      })
      const warrantyPeriodDays = input.warrantyPeriodDays ?? settings?.defaultWarrantyPeriodDays ?? 30

      // Calculate dates
      const startDate = input.startDate ? new Date(input.startDate) : (ticket.actualCompletionDate ? new Date(ticket.actualCompletionDate) : new Date())
      const expiryDate = new Date(startDate)
      expiryDate.setDate(expiryDate.getDate() + warrantyPeriodDays)

      const warranty = await db.warranty.create({
        data: {
          ticketId: input.ticketId,
          storeId,
          customerId: ticket.customerId,
          warrantyPeriodDays,
          startDate,
          expiryDate,
          warrantyType: input.warrantyType ?? 'both',
          status: 'active',
          terms: input.terms ?? null,
          notes: input.notes ?? null,
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
      })

      return mapPrismaWarranty(warranty)
    } catch (error) {
      console.error('Error creating warranty:', error)
      throw error
    }
  },

  getById: async (id: string, storeId: string): Promise<Warranty | undefined> => {
    try {
      const warranty = await db.warranty.findFirst({
        where: {
          id,
          storeId,
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
      })

      if (!warranty) {
        return undefined
      }

      // Update status if expired
      await updateWarrantyStatus(warranty)

      // Re-fetch if status was updated
      const updatedWarranty = await db.warranty.findUnique({
        where: { id },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
      })

      return updatedWarranty ? mapPrismaWarranty(updatedWarranty) : undefined
    } catch (error) {
      console.error('Error fetching warranty by id:', error)
      throw error
    }
  },

  getByTicketId: async (ticketId: string, storeId: string): Promise<Warranty | undefined> => {
    try {
      const warranty = await db.warranty.findFirst({
        where: {
          ticketId,
          storeId,
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
      })

      if (!warranty) {
        return undefined
      }

      // Update status if expired
      await updateWarrantyStatus(warranty)

      // Re-fetch if status was updated
      const updatedWarranty = await db.warranty.findUnique({
        where: { id: warranty.id },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
      })

      return updatedWarranty ? mapPrismaWarranty(updatedWarranty) : undefined
    } catch (error) {
      console.error('Error fetching warranty by ticket id:', error)
      throw error
    }
  },

  getByCustomerId: async (customerId: string, storeId: string): Promise<Warranty[]> => {
    try {
      const warranties = await db.warranty.findMany({
        where: {
          customerId,
          storeId,
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
        orderBy: {
          expiryDate: 'desc',
        },
      })

      // Update statuses for all warranties
      for (const warranty of warranties) {
        await updateWarrantyStatus(warranty)
      }

      // Re-fetch all warranties
      const updatedWarranties = await db.warranty.findMany({
        where: {
          customerId,
          storeId,
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
        orderBy: {
          expiryDate: 'desc',
        },
      })

      return updatedWarranties.map(mapPrismaWarranty)
    } catch (error) {
      console.error('Error fetching warranties by customer id:', error)
      throw error
    }
  },

  getAll: async (
    storeId: string,
    filters?: WarrantyFilters
  ): Promise<PaginatedWarrantyResponse> => {
    try {
      const page = filters?.page ?? 1
      const limit = filters?.limit ?? 50
      const offset = (page - 1) * limit

      // Build where clause
      const where: any = { storeId }

      // Search filter
      if (filters?.search && filters.search.trim()) {
        const searchTerm = filters.search.trim()
        where.OR = [
          { ticket: { ticketNumber: { contains: searchTerm, mode: 'insensitive' } } },
          { ticket: { customer: { name: { contains: searchTerm, mode: 'insensitive' } } } },
          { ticket: { customer: { email: { contains: searchTerm, mode: 'insensitive' } } } },
          { ticket: { deviceType: { contains: searchTerm, mode: 'insensitive' } } },
          { ticket: { deviceBrand: { contains: searchTerm, mode: 'insensitive' } } },
          { ticket: { deviceModel: { contains: searchTerm, mode: 'insensitive' } } },
          { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { customer: { email: { contains: searchTerm, mode: 'insensitive' } } },
        ]
      }

      // Status filter - support comma-separated values (e.g., "active,expired")
      if (filters?.status) {
        const statuses = filters.status.split(',').map(s => s.trim()).filter(Boolean)
        if (statuses.length === 1) {
          where.status = statuses[0]
        } else if (statuses.length > 1) {
          where.status = { in: statuses }
        }
      }

      // Get total count and paginated results
      const [total, warranties] = await Promise.all([
        db.warranty.count({ where }),
        db.warranty.findMany({
          where,
          include: {
            ticket: {
              include: {
                customer: true,
              },
            },
            customer: true,
            warrantyClaims: true,
          },
          orderBy: {
            expiryDate: 'desc',
          },
          skip: offset,
          take: limit,
        }),
      ])

      // Update statuses for paginated warranties
      for (const warranty of warranties) {
        await updateWarrantyStatus(warranty)
      }

      // Re-fetch paginated warranties after status updates
      const updatedWarranties = await db.warranty.findMany({
        where: {
          id: { in: warranties.map((w: PrismaWarranty) => w.id) },
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
        orderBy: {
          expiryDate: 'desc',
        },
      })

      const totalPages = Math.ceil(total / limit)

      return {
        warranties: updatedWarranties.map(mapPrismaWarranty),
        total,
        page,
        limit,
        totalPages,
      }
    } catch (error) {
      console.error('Error fetching all warranties:', error)
      throw error
    }
  },

  getActiveWarranties: async (storeId: string, daysAhead: number = 30): Promise<Warranty[]> => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + daysAhead)

      const warranties = await db.warranty.findMany({
        where: {
          storeId,
          status: 'active',
          expiryDate: {
            gte: today,
            lte: futureDate,
          },
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
        orderBy: {
          expiryDate: 'asc',
        },
      })

      // Update statuses for all warranties
      for (const warranty of warranties) {
        await updateWarrantyStatus(warranty)
      }

      // Re-fetch active warranties
      const updatedWarranties = await db.warranty.findMany({
        where: {
          storeId,
          status: 'active',
          expiryDate: {
            gte: today,
            lte: futureDate,
          },
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
        orderBy: {
          expiryDate: 'asc',
        },
      })

      return updatedWarranties.map(mapPrismaWarranty)
    } catch (error) {
      console.error('Error fetching active warranties:', error)
      throw error
    }
  },

  getExpiredWarranties: async (storeId: string): Promise<Warranty[]> => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // First update all active warranties that are expired
      await db.warranty.updateMany({
        where: {
          storeId,
          status: 'active',
          expiryDate: {
            lt: today,
          },
        },
        data: {
          status: 'expired',
        },
      })

      const warranties = await db.warranty.findMany({
        where: {
          storeId,
          status: 'expired',
        },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
        orderBy: {
          expiryDate: 'desc',
        },
      })

      return warranties.map(mapPrismaWarranty)
    } catch (error) {
      console.error('Error fetching expired warranties:', error)
      throw error
    }
  },

  update: async (id: string, input: UpdateWarrantyInput, storeId: string): Promise<Warranty | null> => {
    try {
      // Verify warranty belongs to store
      const existing = await db.warranty.findFirst({
        where: {
          id,
          storeId,
        },
      })

      if (!existing) {
        return null
      }

      const updateData: any = {}

      if (input.warrantyPeriodDays !== undefined) {
        updateData.warrantyPeriodDays = input.warrantyPeriodDays
        // Recalculate expiry date
        const startDate = existing.startDate
        const expiryDate = new Date(startDate)
        expiryDate.setDate(expiryDate.getDate() + input.warrantyPeriodDays)
        updateData.expiryDate = expiryDate
      }

      if (input.warrantyType !== undefined) {
        updateData.warrantyType = input.warrantyType
      }

      if (input.status !== undefined) {
        updateData.status = input.status
      }

      if (input.terms !== undefined) {
        updateData.terms = input.terms || null
      }

      if (input.notes !== undefined) {
        updateData.notes = input.notes || null
      }

      if (Object.keys(updateData).length === 0) {
        // No updates, return existing
        const warranty = await db.warranty.findUnique({
          where: { id },
          include: {
            ticket: {
              include: {
                customer: true,
              },
            },
            customer: true,
            warrantyClaims: true,
          },
        })
        return warranty ? mapPrismaWarranty(warranty) : null
      }

      await db.warranty.update({
        where: { id },
        data: updateData,
      })

      const warranty = await db.warranty.findUnique({
        where: { id },
        include: {
          ticket: {
            include: {
              customer: true,
            },
          },
          customer: true,
          warrantyClaims: true,
        },
      })

      return warranty ? mapPrismaWarranty(warranty) : null
    } catch (error) {
      console.error('Error updating warranty:', error)
      throw error
    }
  },

  voidWarranty: async (id: string, storeId: string): Promise<Warranty | null> => {
    try {
      return warrantyStorage.update(id, { status: 'voided' }, storeId)
    } catch (error) {
      console.error('Error voiding warranty:', error)
      throw error
    }
  },

  // Warranty Claim methods
  createClaim: async (input: CreateWarrantyClaimInput, storeId: string): Promise<WarrantyClaim> => {
    try {
      // Verify warranty exists and belongs to store
      const warranty = await db.warranty.findFirst({
        where: {
          id: input.warrantyId,
          storeId,
        },
      })

      if (!warranty) {
        throw new Error('Warranty not found or does not belong to this store')
      }

      // Update warranty status to 'claimed' if it's active
      if (warranty.status === 'active') {
        await db.warranty.update({
          where: { id: input.warrantyId },
          data: { status: 'claimed' },
        })
      }

      const claim = await db.warrantyClaim.create({
        data: {
          warrantyId: input.warrantyId,
          storeId,
          issueDescription: input.issueDescription,
          claimDate: input.claimDate ? new Date(input.claimDate) : new Date(),
          status: 'pending',
        },
      })

      return mapPrismaWarrantyClaim(claim)
    } catch (error) {
      console.error('Error creating warranty claim:', error)
      throw error
    }
  },

  getClaimById: async (id: string, storeId: string): Promise<WarrantyClaim | undefined> => {
    try {
      const claim = await db.warrantyClaim.findFirst({
        where: {
          id,
          storeId,
        },
      })

      if (!claim) {
        return undefined
      }

      return mapPrismaWarrantyClaim(claim)
    } catch (error) {
      console.error('Error fetching warranty claim by id:', error)
      throw error
    }
  },

  getClaimsByWarrantyId: async (warrantyId: string, storeId: string): Promise<WarrantyClaim[]> => {
    try {
      const claims = await db.warrantyClaim.findMany({
        where: {
          warrantyId,
          storeId,
        },
        orderBy: {
          claimDate: 'desc',
        },
      })

      return claims.map(mapPrismaWarrantyClaim)
    } catch (error) {
      console.error('Error fetching warranty claims by warranty id:', error)
      throw error
    }
  },

  getAllClaims: async (storeId: string, status?: WarrantyClaimStatus): Promise<WarrantyClaim[]> => {
    try {
      const where: any = { storeId }
      if (status) {
        where.status = status
      }

      const claims = await db.warrantyClaim.findMany({
        where,
        orderBy: {
          claimDate: 'desc',
        },
      })

      return claims.map(mapPrismaWarrantyClaim)
    } catch (error) {
      console.error('Error fetching all warranty claims:', error)
      throw error
    }
  },

  updateClaim: async (id: string, input: UpdateWarrantyClaimInput, storeId: string): Promise<WarrantyClaim | null> => {
    try {
      // Verify claim belongs to store
      const existing = await db.warrantyClaim.findFirst({
        where: {
          id,
          storeId,
        },
      })

      if (!existing) {
        return null
      }

      const updateData: any = {}

      if (input.status !== undefined) {
        updateData.status = input.status
      }

      if (input.resolutionNotes !== undefined) {
        updateData.resolutionNotes = input.resolutionNotes || null
      }

      if (input.resolutionDate !== undefined) {
        updateData.resolutionDate = input.resolutionDate ? new Date(input.resolutionDate) : null
      }

      if (input.relatedTicketId !== undefined) {
        updateData.relatedTicketId = input.relatedTicketId || null
      }

      if (Object.keys(updateData).length === 0) {
        // No updates, return existing
        return mapPrismaWarrantyClaim(existing)
      }

      await db.warrantyClaim.update({
        where: { id },
        data: updateData,
      })

      const claim = await db.warrantyClaim.findUnique({
        where: { id },
      })

      return claim ? mapPrismaWarrantyClaim(claim) : null
    } catch (error) {
      console.error('Error updating warranty claim:', error)
      throw error
    }
  },
}


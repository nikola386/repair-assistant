import { RepairTicket, CreateTicketInput, UpdateTicketInput, PaginatedTicketsResponse, TicketStatus, TicketPriority, Expense, CreateExpenseInput, UpdateExpenseInput } from '../types/ticket'
import { db } from './db'
import { deleteFile } from './storage'
import { del } from '@vercel/blob'
import { Decimal } from '@prisma/client/runtime/library'
import { inventoryStorage } from './inventoryStorage'
import { warrantyStorage } from './warrantyStorage'
import type { TicketImage as PrismaTicketImage, Expense as PrismaExpense } from '@prisma/client'

export type TicketImage = Omit<PrismaTicketImage, 'createdAt'> & {
  createdAt: string
  fileSize?: number
  mimeType?: string
}

const mapPrismaExpense = (expense: PrismaExpense): Expense => {
  return {
    id: expense.id,
    ticketId: expense.ticketId,
    inventoryItemId: expense.inventoryItemId ?? undefined,
    name: expense.name,
    quantity: expense.quantity.toNumber(),
    price: expense.price.toNumber(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}

const generateTicketNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const bytes = new Uint8Array(3)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 4).toUpperCase()
  return `TK-${timestamp}-${random}`
}

const mapPrismaImage = (image: PrismaTicketImage): TicketImage => {
  return {
    ...image,
    fileSize: image.fileSize ?? undefined,
    mimeType: image.mimeType ?? undefined,
    createdAt: image.createdAt.toISOString(),
  } as TicketImage
}

const getOrCreateCustomer = async (
  name: string,
  email: string,
  phone: string,
  storeId: string
): Promise<string> => {
  const existing = await db.customer.findFirst({
    where: {
      storeId,
      email: {
        equals: email.toLowerCase(),
        mode: 'insensitive',
      },
    },
  })

  if (existing) {
    await db.customer.update({
      where: { id: existing.id },
      data: {
        name,
        phone,
      },
    })

    return existing.id
  }

  const newCustomer = await db.customer.create({
    data: {
      name,
      email: email.toLowerCase(),
      phone,
      storeId,
    },
  })

  return newCustomer.id
}

type PrismaTicketWithCustomer = Awaited<ReturnType<typeof db.repairTicket.findFirst<{ include: { customer: true } }>>>

const mapPrismaTicket = (ticket: NonNullable<PrismaTicketWithCustomer>): RepairTicket => {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerId: ticket.customerId,
    customerName: ticket.customer.name,
    customerEmail: ticket.customer.email,
    customerPhone: ticket.customer.phone,
    deviceType: ticket.deviceType,
    deviceBrand: ticket.deviceBrand || undefined,
    deviceModel: ticket.deviceModel || undefined,
    deviceSerialNumber: ticket.deviceSerialNumber || undefined,
    issueDescription: ticket.issueDescription,
    status: ticket.status as TicketStatus,
    priority: ticket.priority as TicketPriority,
    estimatedCost: ticket.estimatedCost ? ticket.estimatedCost.toNumber() : undefined,
    actualCost: ticket.actualCost ? ticket.actualCost.toNumber() : undefined,
    estimatedCompletionDate: ticket.estimatedCompletionDate ? ticket.estimatedCompletionDate.toISOString().split('T')[0] : undefined,
    actualCompletionDate: ticket.actualCompletionDate ? ticket.actualCompletionDate.toISOString().split('T')[0] : undefined,
    notes: ticket.notes || undefined,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  }
}

export const ticketStorage = {
  getAll: async (storeId: string): Promise<RepairTicket[]> => {
    try {
      const result = await db.repairTicket.findMany({
        where: {
          storeId,
        },
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const tickets = result.map(mapPrismaTicket)
      for (const ticket of tickets) {
        ticket.images = await ticketStorage.getImagesByTicketId(ticket.id)
        ticket.expenses = await ticketStorage.getExpensesByTicketId(ticket.id)
      }
      return tickets
    } catch (error) {
      console.error('Error fetching all tickets:', error)
      throw error
    }
  },

  getPaginated: async (
    storeId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    priority?: string
  ): Promise<PaginatedTicketsResponse> => {
    try {
      const offset = (page - 1) * limit

      const where: any = {
        storeId,
      }

      if (search && search.trim()) {
        const searchTerm = search.trim()
        where.OR = [
          { ticketNumber: { contains: searchTerm, mode: 'insensitive' } },
          { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { customer: { email: { contains: searchTerm, mode: 'insensitive' } } },
          { deviceType: { contains: searchTerm, mode: 'insensitive' } },
          { deviceBrand: { contains: searchTerm, mode: 'insensitive' } },
          { deviceModel: { contains: searchTerm, mode: 'insensitive' } },
          { deviceSerialNumber: { contains: searchTerm, mode: 'insensitive' } },
          { issueDescription: { contains: searchTerm, mode: 'insensitive' } },
        ]
      }

      if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
        if (statuses.length === 1) {
          where.status = statuses[0]
        } else if (statuses.length > 1) {
          where.status = { in: statuses }
        }
      }

      if (priority) {
        const priorities = priority.split(',').map(p => p.trim()).filter(Boolean)
        if (priorities.length === 1) {
          where.priority = priorities[0]
        } else if (priorities.length > 1) {
          where.priority = { in: priorities }
        }
      }

      const [total, result] = await Promise.all([
        db.repairTicket.count({ where }),
        db.repairTicket.findMany({
          where,
          include: {
            customer: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: offset,
          take: limit,
        }),
      ])

      const tickets = result.map(mapPrismaTicket)
      for (const ticket of tickets) {
        ticket.images = await ticketStorage.getImagesByTicketId(ticket.id)
        ticket.expenses = await ticketStorage.getExpensesByTicketId(ticket.id)
      }

      const totalPages = Math.ceil(total / limit)

      return {
        tickets,
        total,
        page,
        limit,
        totalPages,
      }
    } catch (error) {
      console.error('Error fetching paginated tickets:', error)
      throw error
    }
  },

  getById: async (id: string, storeId: string): Promise<RepairTicket | undefined> => {
    try {
      const result = await db.repairTicket.findFirst({
        where: {
          id,
          storeId,
        },
        include: {
          customer: true,
        },
      })

      if (!result) {
        return undefined
      }
      const ticket = mapPrismaTicket(result)
      ticket.images = await ticketStorage.getImagesByTicketId(id)
      ticket.expenses = await ticketStorage.getExpensesByTicketId(id)
      return ticket
    } catch (error) {
      console.error('Error fetching ticket by id:', error)
      throw error
    }
  },

  getByTicketNumber: async (ticketNumber: string, storeId: string): Promise<RepairTicket | undefined> => {
    try {
      const result = await db.repairTicket.findFirst({
        where: {
          ticketNumber,
          storeId,
        },
        include: {
          customer: true,
        },
      })

      if (!result) {
        return undefined
      }
      return mapPrismaTicket(result)
    } catch (error) {
      console.error('Error fetching ticket by ticket number:', error)
      throw error
    }
  },

  create: async (input: CreateTicketInput, storeId: string): Promise<RepairTicket> => {
    try {
      const customerId = await getOrCreateCustomer(
        input.customerName,
        input.customerEmail,
        input.customerPhone,
        storeId
      )

      const ticketNumber = generateTicketNumber()

      await db.repairTicket.create({
        data: {
          ticketNumber,
          customerId,
          storeId,
          deviceType: input.deviceType,
          deviceBrand: input.deviceBrand || null,
          deviceModel: input.deviceModel || null,
          deviceSerialNumber: input.deviceSerialNumber || null,
          issueDescription: input.issueDescription,
          status: 'pending',
          priority: input.priority || 'medium',
          estimatedCost: input.estimatedCost ? new Decimal(input.estimatedCost.toString()) : null,
          estimatedCompletionDate: input.estimatedCompletionDate ? new Date(input.estimatedCompletionDate) : null,
          notes: input.notes || null,
        },
      })

      const ticket = await ticketStorage.getByTicketNumber(ticketNumber, storeId)
      if (!ticket) {
        throw new Error('Failed to retrieve created ticket')
      }
      return ticket
    } catch (error) {
      console.error('Error creating ticket:', error)
      throw error
    }
  },

  update: async (id: string, input: UpdateTicketInput, storeId: string): Promise<RepairTicket | null> => {
    try {
      const currentTicket = await ticketStorage.getById(id, storeId)
      if (!currentTicket) {
        return null
      }

      let customerId: string | undefined
      if (input.customerName !== undefined || input.customerEmail !== undefined || input.customerPhone !== undefined) {
        const newCustomerName = input.customerName ?? currentTicket.customerName
        const newCustomerEmail = input.customerEmail ?? currentTicket.customerEmail
        const newCustomerPhone = input.customerPhone ?? currentTicket.customerPhone

        customerId = await getOrCreateCustomer(newCustomerName, newCustomerEmail, newCustomerPhone, storeId)
      }

      const updateData: any = {}

      if (customerId !== undefined) {
        updateData.customerId = customerId
      }
      if (input.deviceType !== undefined) {
        updateData.deviceType = input.deviceType
      }
      if (input.deviceBrand !== undefined) {
        updateData.deviceBrand = input.deviceBrand || null
      }
      if (input.deviceModel !== undefined) {
        updateData.deviceModel = input.deviceModel || null
      }
      if (input.deviceSerialNumber !== undefined) {
        updateData.deviceSerialNumber = input.deviceSerialNumber || null
      }
      if (input.issueDescription !== undefined) {
        updateData.issueDescription = input.issueDescription
      }
      if (input.status !== undefined) {
        updateData.status = input.status
      }
      if (input.priority !== undefined) {
        updateData.priority = input.priority
      }
      if (input.estimatedCost !== undefined) {
        updateData.estimatedCost = input.estimatedCost ? new Decimal(input.estimatedCost.toString()) : null
      }
      if (input.actualCost !== undefined) {
        updateData.actualCost = input.actualCost ? new Decimal(input.actualCost.toString()) : null
      }
      if (input.estimatedCompletionDate !== undefined) {
        updateData.estimatedCompletionDate = input.estimatedCompletionDate ? new Date(input.estimatedCompletionDate) : null
      }
      if (input.actualCompletionDate !== undefined) {
        updateData.actualCompletionDate = input.actualCompletionDate ? new Date(input.actualCompletionDate) : null
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes || null
      }

      if (Object.keys(updateData).length === 0) {
        return currentTicket
      }

      await db.repairTicket.update({
        where: { id },
        data: updateData,
      })

      const ticket = await ticketStorage.getById(id, storeId)
      if (!ticket) {
        return null
      }

      const isCompleted = input.status === 'completed' || ticket.status === 'completed'
      const hasCompletionDate = input.actualCompletionDate || ticket.actualCompletionDate
      
      if (isCompleted && hasCompletionDate) {
        try {
          const existingWarranty = await warrantyStorage.getByTicketId(id, storeId)
          if (!existingWarranty) {
            const settings = await db.settings.findUnique({
              where: { storeId },
            })
            const warrantyPeriodDays = settings?.defaultWarrantyPeriodDays ?? 30

            const completionDate = input.actualCompletionDate || ticket.actualCompletionDate
            if (!completionDate) {
              console.warn('Cannot create warranty: no completion date available')
              return ticket
            }

            await warrantyStorage.create(
              {
                ticketId: id,
                warrantyPeriodDays,
                warrantyType: 'both',
                startDate: completionDate,
              },
              storeId
            )
          }
        } catch (warrantyError) {
          console.error('Error auto-creating warranty:', warrantyError)
        }
      }

      return ticket
    } catch (error) {
      console.error('Error updating ticket:', error)
      throw error
    }
  },

  delete: async (id: string, storeId: string): Promise<boolean> => {
    try {
      const ticket = await ticketStorage.getById(id, storeId)
      if (!ticket) {
        return false
      }

      const images = await ticketStorage.getImagesByTicketId(id)

      for (const image of images) {
        if (image.filePath) {
          if (image.filePath.startsWith('https://')) {
            try {
              await del(image.filePath)
            } catch (fileError) {
              console.error(`Error deleting blob for image ${image.id}:`, fileError)
            }
          }
        }
      }

      await db.ticketImage.deleteMany({
        where: { ticketId: id },
      })

      const result = await db.repairTicket.delete({
        where: { id },
      })

      return !!result
    } catch (error) {
      console.error('Error deleting ticket:', error)
      throw error
    }
  },

  getImagesByTicketId: async (ticketId: string): Promise<TicketImage[]> => {
    try {
      const result = await db.ticketImage.findMany({
        where: { ticketId },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return result.map(mapPrismaImage)
    } catch (error) {
      console.error('Error fetching ticket images:', error)
      throw error
    }
  },

  getImageById: async (imageId: string): Promise<TicketImage | undefined> => {
    try {
      const result = await db.ticketImage.findUnique({
        where: { id: imageId },
      })

      if (!result) {
        return undefined
      }

      return mapPrismaImage(result)
    } catch (error) {
      console.error('Error fetching image by id:', error)
      throw error
    }
  },

  createImage: async (
    ticketId: string,
    fileName: string,
    filePath: string,
    fileSize?: number,
    mimeType?: string
  ): Promise<TicketImage> => {
    try {
      const result = await db.ticketImage.create({
        data: {
          ticketId,
          fileName,
          filePath,
          fileSize: fileSize || null,
          mimeType: mimeType || null,
        },
      })

      return mapPrismaImage(result)
    } catch (error) {
      console.error('Error creating ticket image:', error)
      throw error
    }
  },

  deleteImage: async (imageId: string): Promise<boolean> => {
    try {
      const image = await ticketStorage.getImageById(imageId)

      if (!image) {
        return false
      }

      if (image.filePath) {
        try {
          await deleteFile(image.filePath)
        } catch (fileError) {
          console.error('Error deleting file:', fileError)
        }
      }

      await db.ticketImage.delete({
        where: { id: imageId },
      })

      return true
    } catch (error) {
      console.error('Error deleting ticket image:', error)
      throw error
    }
  },

  getExpensesByTicketId: async (ticketId: string): Promise<Expense[]> => {
    try {
      const result = await db.expense.findMany({
        where: { ticketId },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return result.map(mapPrismaExpense)
    } catch (error) {
      console.error('Error fetching ticket expenses:', error)
      throw error
    }
  },

  getExpenseById: async (expenseId: string): Promise<Expense | undefined> => {
    try {
      const result = await db.expense.findUnique({
        where: { id: expenseId },
      })

      if (!result) {
        return undefined
      }

      return mapPrismaExpense(result)
    } catch (error) {
      console.error('Error fetching expense by id:', error)
      throw error
    }
  },

  createExpense: async (input: CreateExpenseInput): Promise<Expense> => {
    try {
      if (input.inventoryItemId) {
        const ticket = await db.repairTicket.findUnique({
          where: { id: input.ticketId },
        })

        if (!ticket || !ticket.storeId) {
          throw new Error('Ticket not found')
        }

        const inventoryItem = await inventoryStorage.getById(input.inventoryItemId, ticket.storeId)
        if (!inventoryItem) {
          throw new Error('Inventory item not found or does not belong to this store')
        }

        if (inventoryItem.currentQuantity < input.quantity) {
          throw new Error(`Insufficient inventory. Available: ${inventoryItem.currentQuantity}, Required: ${input.quantity}`)
        }

        await inventoryStorage.adjustQuantity(input.inventoryItemId, ticket.storeId, -input.quantity)
      }

      const result = await db.expense.create({
        data: {
          ticketId: input.ticketId,
          inventoryItemId: input.inventoryItemId ?? null,
          name: input.name,
          quantity: new Decimal(input.quantity.toString()),
          price: new Decimal(input.price.toString()),
        },
      })

      return mapPrismaExpense(result)
    } catch (error) {
      console.error('Error creating expense:', error)
      throw error
    }
  },

  updateExpense: async (expenseId: string, input: UpdateExpenseInput): Promise<Expense | null> => {
    try {
      const existingExpense = await ticketStorage.getExpenseById(expenseId)
      if (!existingExpense) {
        throw new Error('Expense not found')
      }

      if (existingExpense.inventoryItemId && input.quantity !== undefined) {
        const ticket = await db.repairTicket.findUnique({
          where: { id: existingExpense.ticketId },
        })

        if (!ticket || !ticket.storeId) {
          throw new Error('Ticket not found')
        }

        const quantityChange = input.quantity - existingExpense.quantity
        
        if (quantityChange !== 0) {
          if (quantityChange < 0) {
          } else {
            const inventoryItem = await inventoryStorage.getById(existingExpense.inventoryItemId, ticket.storeId)
            if (!inventoryItem) {
              throw new Error('Inventory item not found')
            }
            if (inventoryItem.currentQuantity < quantityChange) {
              throw new Error(`Insufficient inventory. Available: ${inventoryItem.currentQuantity}, Required: ${quantityChange}`)
            }
          }

          await inventoryStorage.adjustQuantity(existingExpense.inventoryItemId, ticket.storeId, -quantityChange)
        }
      }

      const updateData: any = {}

      if (input.name !== undefined) {
        updateData.name = input.name
      }
      if (input.quantity !== undefined) {
        updateData.quantity = new Decimal(input.quantity.toString())
      }
      if (input.price !== undefined) {
        updateData.price = new Decimal(input.price.toString())
      }

      if (Object.keys(updateData).length === 0) {
        return existingExpense
      }

      const result = await db.expense.update({
        where: { id: expenseId },
        data: updateData,
      })

      return mapPrismaExpense(result)
    } catch (error) {
      console.error('Error updating expense:', error)
      throw error
    }
  },

  deleteExpense: async (expenseId: string): Promise<boolean> => {
    try {
      const existingExpense = await ticketStorage.getExpenseById(expenseId)
      
      await db.expense.delete({
        where: { id: expenseId },
      })

      if (existingExpense?.inventoryItemId) {
        const ticket = await db.repairTicket.findUnique({
          where: { id: existingExpense.ticketId },
        })

        if (ticket && ticket.storeId) {
          await inventoryStorage.adjustQuantity(
            existingExpense.inventoryItemId,
            ticket.storeId,
            existingExpense.quantity
          )
        }
      }

      return true
    } catch (error) {
      console.error('Error deleting expense:', error)
      throw error
    }
  },
}

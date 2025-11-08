import { InventoryItem, CreateInventoryItemInput, UpdateInventoryItemInput } from '../types/inventory'
import { db } from './db'
import { Decimal } from '@prisma/client/runtime/library'
import type { InventoryItem as PrismaInventoryItem } from '@prisma/client'

const mapPrismaInventoryItem = (item: PrismaInventoryItem): InventoryItem => {
  return {
    id: item.id,
    storeId: item.storeId,
    name: item.name,
    sku: item.sku ?? undefined,
    description: item.description ?? undefined,
    category: item.category ?? undefined,
    location: item.location ?? undefined,
    currentQuantity: item.currentQuantity.toNumber(),
    minQuantity: item.minQuantity.toNumber(),
    unitPrice: item.unitPrice?.toNumber(),
    costPrice: item.costPrice?.toNumber(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export interface InventoryFilters {
  search?: string
  category?: string
  location?: string
  lowStock?: boolean
  page?: number
  limit?: number
}

export interface PaginatedInventoryResponse {
  items: InventoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const inventoryStorage = {
  getAll: async (
    storeId: string,
    filters?: InventoryFilters
  ): Promise<PaginatedInventoryResponse> => {
    try {
      const page = filters?.page ?? 1
      const limit = filters?.limit ?? 50
      const offset = (page - 1) * limit

      const where: any = {
        storeId,
      }

      if (filters?.search && filters.search.trim()) {
        const searchTerm = filters.search.trim()
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ]
      }

      if (filters?.category) {
        const categories = filters.category.split(',').map(c => c.trim()).filter(Boolean)
        if (categories.length === 1) {
          where.category = categories[0]
        } else if (categories.length > 1) {
          where.category = { in: categories }
        }
      }

      if (filters?.location) {
        const locations = filters.location.split(',').map(l => l.trim()).filter(Boolean)
        if (locations.length === 1) {
          where.location = locations[0]
        } else if (locations.length > 1) {
          where.location = { in: locations }
        }
      }

      const allItems = await db.inventoryItem.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      })

      let filteredItems = allItems
      if (filters?.lowStock) {
        filteredItems = allItems.filter(
          (item) => item.currentQuantity.toNumber() <= item.minQuantity.toNumber()
        )
      }

      const total = filteredItems.length
      const paginatedItems = filteredItems.slice(offset, offset + limit)
      const totalPages = Math.ceil(total / limit)

      return {
        items: paginatedItems.map(mapPrismaInventoryItem),
        total,
        page,
        limit,
        totalPages,
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error)
      throw error
    }
  },

  getById: async (id: string, storeId: string): Promise<InventoryItem | undefined> => {
    try {
      const item = await db.inventoryItem.findFirst({
        where: {
          id,
          storeId,
        },
      })

      if (!item) {
        return undefined
      }

      return mapPrismaInventoryItem(item)
    } catch (error) {
      console.error('Error fetching inventory item by id:', error)
      throw error
    }
  },

  create: async (
    storeId: string,
    input: CreateInventoryItemInput
  ): Promise<InventoryItem> => {
    try {
      const item = await db.inventoryItem.create({
        data: {
          storeId,
          name: input.name.trim(),
          sku: input.sku?.trim() || null,
          description: input.description?.trim() || null,
          category: input.category?.trim() || null,
          location: input.location?.trim() || null,
          currentQuantity: new Decimal(input.currentQuantity?.toString() || '0'),
          minQuantity: new Decimal(input.minQuantity?.toString() || '0'),
          unitPrice: input.unitPrice !== undefined ? new Decimal(input.unitPrice.toString()) : null,
          costPrice: input.costPrice !== undefined ? new Decimal(input.costPrice.toString()) : null,
        },
      })

      return mapPrismaInventoryItem(item)
    } catch (error) {
      console.error('Error creating inventory item:', error)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('SKU must be unique within this store')
      }
      throw error
    }
  },

  update: async (
    id: string,
    storeId: string,
    input: UpdateInventoryItemInput
  ): Promise<InventoryItem> => {
    try {
      const existing = await db.inventoryItem.findFirst({
        where: {
          id,
          storeId,
        },
      })

      if (!existing) {
        throw new Error('Inventory item not found')
      }

      const updateData: any = {}
      
      if (input.name !== undefined) {
        updateData.name = input.name.trim()
      }
      if (input.sku !== undefined) {
        updateData.sku = input.sku.trim() || null
      }
      if (input.description !== undefined) {
        updateData.description = input.description.trim() || null
      }
      if (input.category !== undefined) {
        updateData.category = input.category.trim() || null
      }
      if (input.location !== undefined) {
        updateData.location = input.location.trim() || null
      }
      if (input.currentQuantity !== undefined) {
        updateData.currentQuantity = new Decimal(input.currentQuantity.toString())
      }
      if (input.minQuantity !== undefined) {
        updateData.minQuantity = new Decimal(input.minQuantity.toString())
      }
      if (input.unitPrice !== undefined) {
        updateData.unitPrice = input.unitPrice !== null ? new Decimal(input.unitPrice.toString()) : null
      }
      if (input.costPrice !== undefined) {
        updateData.costPrice = input.costPrice !== null ? new Decimal(input.costPrice.toString()) : null
      }

      const item = await db.inventoryItem.update({
        where: { id },
        data: updateData,
      })

      return mapPrismaInventoryItem(item)
    } catch (error) {
      console.error('Error updating inventory item:', error)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('SKU must be unique within this store')
      }
      throw error
    }
  },

  adjustQuantity: async (
    id: string,
    storeId: string,
    quantityChange: number
  ): Promise<InventoryItem> => {
    try {
      const existing = await db.inventoryItem.findFirst({
        where: {
          id,
          storeId,
        },
      })

      if (!existing) {
        throw new Error('Inventory item not found')
      }

      const newQuantity = existing.currentQuantity.toNumber() + quantityChange

      if (newQuantity < 0) {
        throw new Error('Quantity cannot be negative')
      }

      const item = await db.inventoryItem.update({
        where: { id },
        data: {
          currentQuantity: new Decimal(newQuantity.toString()),
        },
      })

      return mapPrismaInventoryItem(item)
    } catch (error) {
      console.error('Error adjusting inventory quantity:', error)
      throw error
    }
  },

  delete: async (id: string, storeId: string): Promise<boolean> => {
    try {
      const existing = await db.inventoryItem.findFirst({
        where: {
          id,
          storeId,
        },
      })

      if (!existing) {
        return false
      }

      await db.inventoryItem.delete({
        where: { id },
      })

      return true
    } catch (error) {
      console.error('Error deleting inventory item:', error)
      throw error
    }
  },

  getLowStockItems: async (storeId: string): Promise<InventoryItem[]> => {
    try {
      const items = await db.inventoryItem.findMany({
        where: {
          storeId,
        },
        orderBy: {
          name: 'asc',
        },
      })

      const lowStockItems = items.filter(
        (item) => item.currentQuantity.toNumber() <= item.minQuantity.toNumber()
      )

      return lowStockItems.map(mapPrismaInventoryItem)
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      throw error
    }
  },

  getCategories: async (storeId: string): Promise<string[]> => {
    try {
      const items = await db.inventoryItem.findMany({
        where: {
          storeId,
          category: {
            not: null,
          },
        },
        select: {
          category: true,
        },
        distinct: ['category'],
      })

      return items
        .map((item) => item.category)
        .filter((cat): cat is string => cat !== null)
        .sort()
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  },

  getLocations: async (storeId: string): Promise<string[]> => {
    try {
      const items = await db.inventoryItem.findMany({
        where: {
          storeId,
          location: {
            not: null,
          },
        },
        select: {
          location: true,
        },
        distinct: ['location'],
      })

      return items
        .map((item) => item.location)
        .filter((loc): loc is string => loc !== null)
        .sort()
    } catch (error) {
      console.error('Error fetching locations:', error)
      throw error
    }
  },
}


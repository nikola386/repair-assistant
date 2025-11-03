export interface InventoryItem {
  id: string
  storeId: string
  name: string
  sku?: string
  description?: string
  category?: string
  location?: string
  currentQuantity: number
  minQuantity: number
  unitPrice?: number
  costPrice?: number
  createdAt: string
  updatedAt: string
}

export interface CreateInventoryItemInput {
  name: string
  sku?: string
  description?: string
  category?: string
  location?: string
  currentQuantity?: number
  minQuantity?: number
  unitPrice?: number
  costPrice?: number
}

export interface UpdateInventoryItemInput {
  name?: string
  sku?: string
  description?: string
  category?: string
  location?: string
  currentQuantity?: number
  minQuantity?: number
  unitPrice?: number
  costPrice?: number
}

export interface AdjustQuantityInput {
  quantity: number
  reason?: string
}


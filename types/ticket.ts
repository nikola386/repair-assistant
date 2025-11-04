export type TicketStatus = 'pending' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled'

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

// TicketImage now comes from ticketStorage (based on Prisma type)
import type { TicketImage } from '../lib/ticketStorage'
export type { TicketImage }

export interface Expense {
  id: string
  ticketId: string
  inventoryItemId?: string
  name: string
  quantity: number
  price: number
  createdAt: string
  updatedAt: string
}

export interface RepairTicket {
  id: string
  ticketNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  deviceType: string
  deviceBrand?: string
  deviceModel?: string
  deviceSerialNumber?: string
  issueDescription: string
  status: TicketStatus
  priority: TicketPriority
  estimatedCost?: number
  actualCost?: number
  estimatedCompletionDate?: string
  actualCompletionDate?: string
  notes?: string
  images?: TicketImage[]
  expenses?: Expense[]
  createdAt: string
  updatedAt: string
}

export interface CreateTicketInput {
  customerName: string
  customerEmail: string
  customerPhone: string
  deviceType: string
  deviceBrand?: string
  deviceModel?: string
  deviceSerialNumber?: string
  issueDescription: string
  priority?: TicketPriority
  estimatedCost?: number
  estimatedCompletionDate?: string
  notes?: string
}

export interface UpdateTicketInput {
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  deviceType?: string
  deviceBrand?: string
  deviceModel?: string
  deviceSerialNumber?: string
  issueDescription?: string
  status?: TicketStatus
  priority?: TicketPriority
  estimatedCost?: number
  actualCost?: number
  estimatedCompletionDate?: string
  actualCompletionDate?: string
  notes?: string
}

export interface PaginatedTicketsResponse {
  tickets: RepairTicket[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateExpenseInput {
  ticketId: string
  inventoryItemId?: string
  name: string
  quantity: number
  price: number
}

export interface UpdateExpenseInput {
  name?: string
  quantity?: number
  price?: number
}


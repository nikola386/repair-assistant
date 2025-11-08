export type WarrantyType = 'parts' | 'labor' | 'both'
export type WarrantyStatus = 'active' | 'expired' | 'voided' | 'claimed'
export type WarrantyClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed'

import type { RepairTicket } from './ticket'
import type { Customer } from '@prisma/client'

export interface Warranty {
  id: string
  ticketId: string
  storeId: string
  customerId: string
  warrantyPeriodDays: number
  startDate: string
  expiryDate: string
  warrantyType: WarrantyType
  status: WarrantyStatus
  terms?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // Relations
  ticket?: RepairTicket
  customer?: Customer
  warrantyClaims?: WarrantyClaim[]
}

export interface WarrantyClaim {
  id: string
  warrantyId: string
  storeId: string
  issueDescription: string
  claimDate: string
  status: WarrantyClaimStatus
  resolutionNotes?: string
  resolutionDate?: string
  relatedTicketId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateWarrantyInput {
  ticketId: string
  warrantyPeriodDays?: number
  warrantyType?: WarrantyType
  startDate?: string
  terms?: string
  notes?: string
}

export interface UpdateWarrantyInput {
  warrantyPeriodDays?: number
  warrantyType?: WarrantyType
  status?: WarrantyStatus
  terms?: string
  notes?: string
}

export interface CreateWarrantyClaimInput {
  warrantyId: string
  issueDescription: string
  claimDate?: string
}

export interface UpdateWarrantyClaimInput {
  status?: WarrantyClaimStatus
  resolutionNotes?: string
  resolutionDate?: string
  relatedTicketId?: string
}


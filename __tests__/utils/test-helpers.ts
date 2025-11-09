import { PrismaClient } from '@prisma/client'
import { UserRole } from '@/lib/permissions'

export const createMockSession = (overrides = {}) => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.ADMIN,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  storeId: 'test-store-id',
  role: UserRole.ADMIN,
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockStore = (overrides = {}) => ({
  id: 'test-store-id',
  name: 'Test Store',
  address: '123 Test St',
  city: 'Test City',
  country: 'US',
  currency: 'USD',
  onboarded: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockCustomer = (overrides = {}) => ({
  id: 'test-customer-id',
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '+1234567890',
  storeId: 'test-store-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockTicket = (overrides = {}) => ({
  id: 'test-ticket-id',
  ticketNumber: 'TK-TEST-001',
  customerId: 'test-customer-id',
  storeId: 'test-store-id',
  deviceType: 'Smartphone',
  deviceBrand: 'Apple',
  deviceModel: 'iPhone 13',
  issueDescription: 'Screen replacement needed',
  status: 'pending',
  priority: 'medium',
  estimatedCost: null,
  actualCost: null,
  estimatedCompletionDate: null,
  actualCompletionDate: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockNextRequest = (overrides = {}) => {
  const url = new URL('http://localhost:3001/api/test')
  return {
    method: 'GET',
    url: url.toString(),
    nextUrl: url,
    headers: new Headers(),
    json: jest.fn(),
    ...overrides,
  } as any
}

export const createMockNextResponse = () => {
  return {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    headers: new Headers(),
  } as any
}


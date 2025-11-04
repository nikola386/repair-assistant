/**
 * Script to seed tickets with expenses into the database
 * 
 * Usage: 
 *   npx tsx scripts/seed-tickets.ts
 * 
 * This script will:
 * - Create a store if it doesn't exist
 * - Create inventory items
 * - Create customers (some with multiple tickets)
 * - Create tickets covering all statuses and priorities
 * - Create expenses linked to tickets, some mapped to inventory items
 */

import { db } from '../lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ticketStorage } from '../lib/ticketStorage'
import { inventoryStorage } from '../lib/inventoryStorage'
import type { TicketStatus, TicketPriority } from '../types/ticket'

// Store configuration
const STORE_NAME = 'Майстор Жичко'
const STORE_EMAIL = 'shop@repairassistant.com'

// Configuration
const TOTAL_TICKETS = 10000
const CUSTOMERS_TO_CREATE = 2000 // Average ~5 tickets per customer

// Inventory items to create - increased quantities for 10k tickets
const INVENTORY_ITEMS = [
  { name: 'iPhone Screen', sku: 'IPH-SCR-001', category: 'Screens', location: 'Shelf A1', currentQuantity: 5000, minQuantity: 100, unitPrice: 45.00, costPrice: 30.00, description: 'Original quality iPhone screen replacement' },
  { name: 'Samsung Screen', sku: 'SAM-SCR-001', category: 'Screens', location: 'Shelf A2', currentQuantity: 5000, minQuantity: 100, unitPrice: 50.00, costPrice: 35.00, description: 'Original quality Samsung screen replacement' },
  { name: 'Battery 3000mAh', sku: 'BAT-3000', category: 'Batteries', location: 'Shelf B1', currentQuantity: 8000, minQuantity: 200, unitPrice: 25.00, costPrice: 15.00, description: 'High capacity battery replacement' },
  { name: 'Battery 4000mAh', sku: 'BAT-4000', category: 'Batteries', location: 'Shelf B2', currentQuantity: 8000, minQuantity: 200, unitPrice: 30.00, costPrice: 18.00, description: 'Extra high capacity battery replacement' },
  { name: 'Charging Port', sku: 'CHG-PORT-001', category: 'Components', location: 'Shelf C1', currentQuantity: 6000, minQuantity: 150, unitPrice: 15.00, costPrice: 8.00, description: 'Universal charging port replacement' },
  { name: 'Camera Module', sku: 'CAM-MOD-001', category: 'Components', location: 'Shelf C2', currentQuantity: 5000, minQuantity: 100, unitPrice: 35.00, costPrice: 20.00, description: 'Rear camera module replacement' },
  { name: 'Back Glass', sku: 'GLASS-BACK-001', category: 'Glass', location: 'Shelf D1', currentQuantity: 7000, minQuantity: 150, unitPrice: 20.00, costPrice: 12.00, description: 'Back glass replacement' },
  { name: 'Home Button', sku: 'HOME-BTN-001', category: 'Components', location: 'Shelf C3', currentQuantity: 6000, minQuantity: 100, unitPrice: 12.00, costPrice: 6.00, description: 'Home button replacement' },
  { name: 'Speaker Module', sku: 'SPK-MOD-001', category: 'Audio', location: 'Shelf E1', currentQuantity: 6500, minQuantity: 150, unitPrice: 18.00, costPrice: 10.00, description: 'Speaker module replacement' },
  { name: 'Logic Board Repair', sku: 'LB-REP-001', category: 'Repair Services', location: 'Workbench', currentQuantity: 99999, minQuantity: 0, unitPrice: 150.00, costPrice: 0, description: 'Logic board repair service' },
]

// Customer name templates for generation
const FIRST_NAMES = ['John', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'Robert', 'Jennifer', 'Michael', 'Jessica', 'Christopher', 'Ashley', 'Daniel', 'Amanda', 'Matthew', 'Michelle', 'Andrew', 'Melissa', 'Joshua', 'Nicole', 'James', 'Stephanie', 'Ryan', 'Lauren', 'Justin', 'Kimberly', 'Brandon', 'Amy', 'Jason', 'Angela']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Davis', 'Brown', 'Anderson', 'Taylor', 'Martinez', 'Wilson', 'Moore', 'Jackson', 'Thompson', 'White', 'Harris', 'Martin', 'Garcia', 'Lee', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker']

// Device types and brands
const DEVICE_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Smartwatch', 'Gaming Console']
const BRANDS = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Dell', 'HP', 'Lenovo', 'Sony']
const MODELS = ['iPhone 12', 'iPhone 13', 'iPhone 14', 'Galaxy S21', 'Galaxy S22', 'Pixel 6', 'Pixel 7', 'MacBook Pro', 'ThinkPad X1']

// Issue descriptions
const ISSUE_DESCRIPTIONS = [
  'Screen cracked and touch not responding',
  'Battery drains very quickly, needs replacement',
  'Phone not charging, charging port appears damaged',
  'Camera not working, black screen when trying to take photos',
  'Back glass shattered, needs replacement',
  'Speaker not working, no sound output',
  'Home button not responding',
  'Logic board repair needed, device not booting',
  'Water damage, device not turning on',
  'Screen flickering issue',
  'Battery swelling, safety concern',
  'Charging port loose, cable falls out easily',
]

// Expense templates (some will be linked to inventory, some not)
const EXPENSE_TEMPLATES = [
  { name: 'Screen Replacement', inventoryCategory: 'Screens', quantity: 1 },
  { name: 'Battery Replacement', inventoryCategory: 'Batteries', quantity: 1 },
  { name: 'Charging Port Repair', inventoryCategory: 'Components', quantity: 1 },
  { name: 'Camera Module Replacement', inventoryCategory: 'Components', quantity: 1 },
  { name: 'Back Glass Replacement', inventoryCategory: 'Glass', quantity: 1 },
  { name: 'Home Button Replacement', inventoryCategory: 'Components', quantity: 1 },
  { name: 'Speaker Module Replacement', inventoryCategory: 'Audio', quantity: 1 },
  { name: 'Logic Board Repair Service', inventoryCategory: 'Repair Services', quantity: 1 },
  { name: 'Labor Fee', inventoryCategory: null, quantity: 1 },
  { name: 'Diagnostic Fee', inventoryCategory: null, quantity: 1 },
]

// All statuses and priorities
const STATUSES: TicketStatus[] = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

// Helper function to get or create store
async function getOrCreateStore() {
  let store = await db.store.findFirst({
    where: { name: STORE_NAME },
  })

  if (!store) {
    throw new Error('Store not found');
  } else {
    console.log(`✅ Using existing store: ${store.name}`)
  }

  return store
}

// Helper function to create inventory items
async function createInventoryItems(storeId: string): Promise<Map<string, string[]>> {
  const inventoryMap = new Map<string, string[]>() // category -> array of inventory item ids
  
  console.log(`\n📦 Creating ${INVENTORY_ITEMS.length} inventory items...`)
  
  for (const item of INVENTORY_ITEMS) {
    try {
      const created = await inventoryStorage.create(storeId, {
        name: item.name,
        sku: item.sku,
        category: item.category,
        location: item.location,
        currentQuantity: item.currentQuantity,
        minQuantity: item.minQuantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        description: item.description,
      })
      
      // Add to category array
      if (!inventoryMap.has(item.category)) {
        inventoryMap.set(item.category, [])
      }
      inventoryMap.get(item.category)!.push(created.id)
      
      console.log(`   ✓ Created: ${item.name} (${item.currentQuantity} in stock)`)
    } catch (error) {
      console.error(`   ✗ Error creating ${item.name}:`, error)
    }
  }
  
  return inventoryMap
}

// Helper function to get or create customer
async function getOrCreateCustomer(
  name: string,
  email: string,
  phone: string,
  storeId: string
): Promise<string> {
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
    return existing.id
  }

  const customer = await db.customer.create({
    data: {
      name,
      email: email.toLowerCase(),
      phone,
      storeId,
    },
  })

  return customer.id
}

// Helper function to generate random customer data
function generateCustomerData(index: number) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]
  const name = `${firstName} ${lastName}`
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@email.com`
  const phone = `+1-555-${String(1000 + (index % 9000)).slice(1)}`
  
  return { name, email, phone }
}

// Helper function to generate ticket data
function generateTicketData(
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  ticketIndex: number
) {
  // Distribute statuses and priorities more evenly
  const status = STATUSES[ticketIndex % STATUSES.length]
  const priority = PRIORITIES[ticketIndex % PRIORITIES.length]
  const deviceType = DEVICE_TYPES[ticketIndex % DEVICE_TYPES.length]
  const brand = BRANDS[ticketIndex % BRANDS.length]
  const model = MODELS[ticketIndex % MODELS.length]
  const issueDescription = ISSUE_DESCRIPTIONS[ticketIndex % ISSUE_DESCRIPTIONS.length]

  // Calculate dates based on status - spread over last 2 years
  const now = new Date()
  const daysAgo = (ticketIndex % 730) // Spread over ~2 years
  const createdAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
  
  let estimatedCompletionDate: Date | undefined
  let actualCompletionDate: Date | undefined
  
  if (status === 'completed') {
    estimatedCompletionDate = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000)
    actualCompletionDate = new Date(createdAt.getTime() + 4 * 24 * 60 * 60 * 1000)
  } else if (status === 'in_progress' || status === 'waiting_parts') {
    estimatedCompletionDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  }

  const estimatedCost = 50 + Math.random() * 200
  const actualCost = status === 'completed' ? estimatedCost * (0.8 + Math.random() * 0.4) : undefined

  return {
    customerName,
    customerEmail,
    customerPhone,
    deviceType,
    deviceBrand: brand,
    deviceModel: model,
    issueDescription,
    status,
    priority,
    estimatedCost,
    actualCost,
    estimatedCompletionDate,
    actualCompletionDate,
    createdAt,
  }
}

// Helper function to create expenses for a ticket
async function createExpensesForTicket(
  ticketId: string,
  storeId: string,
  inventoryMap: Map<string, string[]>,
  ticketData: any
) {
  const expensesToCreate = Math.floor(Math.random() * 3) + 1 // 1-3 expenses per ticket
  
  for (let i = 0; i < expensesToCreate; i++) {
    const template = EXPENSE_TEMPLATES[Math.floor(Math.random() * EXPENSE_TEMPLATES.length)]
    
    let inventoryItemId: string | undefined
    let name = template.name
    let quantity = template.quantity
    let price = 0

    // Try to link to inventory if available
    if (template.inventoryCategory && inventoryMap.has(template.inventoryCategory)) {
      const categoryItems = inventoryMap.get(template.inventoryCategory)!
      // Randomly select one item from the category
      inventoryItemId = categoryItems[Math.floor(Math.random() * categoryItems.length)]
      
      // Get inventory item to use its price
      if (inventoryItemId) {
        const inventoryItem = await inventoryStorage.getById(inventoryItemId, storeId)
        if (inventoryItem && inventoryItem.unitPrice) {
          price = inventoryItem.unitPrice
          name = inventoryItem.name
        }
      }
    } else {
      // Manual expense (not linked to inventory)
      price = template.name.includes('Labor') ? 50 + Math.random() * 50 : 20 + Math.random() * 30
    }

    try {
      await ticketStorage.createExpense({
        ticketId,
        inventoryItemId,
        name,
        quantity,
        price,
      })
    } catch (error) {
      console.error(`   ✗ Error creating expense ${name}:`, error)
    }
  }
}

// Main seeding function
async function seedTickets() {
  try {
    console.log('🚀 Starting ticket seeding process...\n')

    // Get or create store
    const store = await getOrCreateStore()
    const storeId = store.id

    // Create inventory items
    const inventoryMap = await createInventoryItems(storeId)

    // Create customers and tickets
    console.log(`\n👥 Creating ${CUSTOMERS_TO_CREATE} customers and ${TOTAL_TICKETS} tickets...`)
    console.log(`   This may take a while. Progress will be shown every 100 tickets.\n`)
    
    let totalTicketsCreated = 0
    let totalExpensesCreated = 0
    let totalCustomersCreated = 0
    const customerMap = new Map<string, { id: string; name: string; email: string; phone: string }>()

    // Create tickets
    for (let ticketIndex = 0; ticketIndex < TOTAL_TICKETS; ticketIndex++) {
      // Determine which customer this ticket belongs to
      // Each customer gets 1-10 tickets (weighted towards fewer tickets)
      const customerIndex = Math.floor(Math.random() * CUSTOMERS_TO_CREATE)
      const customerKey = `customer_${customerIndex}`
      
      let customer
      if (customerMap.has(customerKey)) {
        customer = customerMap.get(customerKey)!
      } else {
        const customerData = generateCustomerData(customerIndex)
        const customerId = await getOrCreateCustomer(
          customerData.name,
          customerData.email,
          customerData.phone,
          storeId
        )
        customer = {
          id: customerId,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
        }
        customerMap.set(customerKey, customer)
        totalCustomersCreated++
      }

      const ticketData = generateTicketData(
        customer.name,
        customer.email,
        customer.phone,
        ticketIndex
      )

      // Create ticket
      const ticket = await ticketStorage.create(
        {
          customerName: ticketData.customerName,
          customerEmail: ticketData.customerEmail,
          customerPhone: ticketData.customerPhone,
          deviceType: ticketData.deviceType,
          deviceBrand: ticketData.deviceBrand,
          deviceModel: ticketData.deviceModel,
          issueDescription: ticketData.issueDescription,
          priority: ticketData.priority,
          estimatedCost: ticketData.estimatedCost,
          estimatedCompletionDate: ticketData.estimatedCompletionDate?.toISOString().split('T')[0],
          notes: `Status: ${ticketData.status}, Priority: ${ticketData.priority}`,
        },
        storeId
      )

      // Update ticket status and dates (since create always sets status to 'pending')
      await ticketStorage.update(
        ticket.id,
        {
          status: ticketData.status,
          actualCost: ticketData.actualCost,
          actualCompletionDate: ticketData.actualCompletionDate?.toISOString().split('T')[0],
        },
        storeId
      )

      // Create expenses for this ticket
      await createExpensesForTicket(ticket.id, storeId, inventoryMap, ticketData)
      
      const expenses = await ticketStorage.getExpensesByTicketId(ticket.id)
      totalExpensesCreated += expenses.length

      totalTicketsCreated++

      // Progress indicator
      if (totalTicketsCreated % 100 === 0) {
        const progress = ((totalTicketsCreated / TOTAL_TICKETS) * 100).toFixed(1)
        console.log(`   Progress: ${totalTicketsCreated}/${TOTAL_TICKETS} tickets (${progress}%) - ${totalExpensesCreated} expenses created`)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Seeding Summary:')
    console.log('='.repeat(60))
    console.log(`   Store: ${store.name}`)
    console.log(`   Inventory Items: ${INVENTORY_ITEMS.length}`)
    console.log(`   Customers Created: ${totalCustomersCreated}`)
    console.log(`   Tickets Created: ${totalTicketsCreated}`)
    console.log(`   Expenses Created: ${totalExpensesCreated}`)
    console.log('\n   Status Distribution:')
    for (const status of STATUSES) {
      const count = await db.repairTicket.count({
        where: { storeId, status },
      })
      console.log(`     - ${status}: ${count}`)
    }
    console.log('\n   Priority Distribution:')
    for (const priority of PRIORITIES) {
      const count = await db.repairTicket.count({
        where: { storeId, priority },
      })
      console.log(`     - ${priority}: ${count}`)
    }
    console.log('='.repeat(60))
    console.log('✅ Seeding completed successfully!')

    // Close database connection
    await db.$disconnect()
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Error seeding tickets:', error.message)
    console.error(error)
    await db.$disconnect()
    process.exit(1)
  }
}

// Run the seeding function
seedTickets()


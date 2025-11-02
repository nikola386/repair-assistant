/**
 * Script to insert 100 sample ticket records into the database
 * 
 * Usage: 
 *   npx tsx scripts/seed-tickets.ts
 * 
 * Note: This script should be run only once to populate the database with sample data.
 * Requires tsx to be installed: npm install -g tsx
 */

import { db } from '../lib/db'
import { Decimal } from '@prisma/client/runtime/library'

// Sample data arrays for generating realistic tickets
const firstNames = [
  'Ivan', 'Maria', 'Georgi', 'Elena', 'Dimitar', 'Sofia', 'Petar', 'Nadezhda',
  'Nikolay', 'Viktoriya', 'Stoyan', 'Yana', 'Martin', 'Daniela', 'Radoslav',
  'Kristina', 'Alexander', 'Gabriela', 'Hristo', 'Iva'
]

const lastNames = [
  'Petrov', 'Ivanov', 'Georgiev', 'Dimitrov', 'Stoyanov', 'Nikolov', 'Todorov',
  'Petrova', 'Ivanova', 'Georgieva', 'Dimitrova', 'Stoyanova', 'Nikolova',
  'Todorova', 'Atanasov', 'Atanasova', 'Vasilev', 'Vasileva', 'Mladenov', 'Mladenova'
]

const deviceTypes = [
  'Smartphone', 'Laptop', 'Tablet', 'Desktop Computer', 'Smartwatch',
  'Gaming Console', 'TV', 'Monitor', 'Printer', 'Router', 'Camera', 'Headphones'
]

const deviceBrands = [
  'Apple', 'Samsung', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Sony',
  'Microsoft', 'LG', 'Huawei', 'Xiaomi', 'Nintendo', 'PlayStation', 'Canon'
]

const deviceModels = [
  'iPhone 14', 'Galaxy S23', 'MacBook Pro', 'ThinkPad', 'ZenBook',
  'Surface Pro', 'iPad Air', 'XPS 13', 'Galaxy Tab', 'AirPods Pro'
]

const issueDescriptions = [
  'Screen not turning on', 'Battery draining too fast', 'Overheating issues',
  'Camera not working', 'WiFi connectivity problems', 'Charging port damaged',
  'Keyboard keys not responding', 'Display flickering', 'Slow performance',
  'Water damage', 'Software crash', 'Hard drive failure', 'No sound output',
  'Touch screen unresponsive', 'Blue screen of death', 'Keyboard backlight not working',
  'Webcam not detected', 'USB ports not working', 'Fans making loud noise',
  'Display has dead pixels', 'System freezing', 'Cannot connect to internet'
]

const notes = [
  'Customer mentioned device worked fine until yesterday',
  'Warranty expired 2 months ago',
  'Device was dropped recently',
  'Customer wants urgent repair',
  'Original packaging available',
  'Device has been repaired before',
  'Water damage visible on inspection',
  'Customer prefers original parts',
  'Budget constraints discussed',
  null,
  null,
  null,
  null
]

const statuses = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled'] as const
const priorities = ['low', 'medium', 'high', 'urgent'] as const

const expenseNames = [
  'Screen Replacement', 'Battery', 'Charging Port', 'Camera Module', 'Logic Board',
  'Keyboard', 'Trackpad', 'RAM Upgrade', 'SSD Replacement', 'Cooling Fan',
  'Motherboard', 'Display Assembly', 'Back Cover', 'Speaker', 'Microphone',
  'Charging Cable', 'Power Adapter', 'Screen Protector', 'Case', 'Labor Fee'
]

// Generate random date within a range (0 to maxDaysAgo days ago)
const randomDateInRange = (maxDaysAgo: number): Date => {
  const date = new Date()
  const daysAgo = Math.floor(Math.random() * maxDaysAgo)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60))
  return date
}

// Generate random date string (for date-only fields)
const randomDateString = (maxDaysAgo: number): string => {
  const date = new Date()
  const daysAgo = Math.floor(Math.random() * maxDaysAgo)
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

// Generate random future date (up to 30 days ahead)
const randomFutureDate = (maxDaysAhead: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + Math.floor(Math.random() * maxDaysAhead) + 1)
  return date.toISOString().split('T')[0]
}

// Generate random phone number
const randomPhone = (): string => {
  const prefix = ['088', '089', '087', '098']
  const prefixIdx = Math.floor(Math.random() * prefix.length)
  const num = Math.floor(1000000 + Math.random() * 9000000)
  return `${prefix[prefixIdx]}${num}`
}

// Generate unique ticket number
const generateTicketNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TK-${timestamp}-${random}`
}

// Generate random email
const randomEmail = (firstName: string, lastName: string): string => {
  const domains = ['gmail.com', 'yahoo.com', 'abv.bg', 'mail.bg', 'outlook.com']
  const domain = domains[Math.floor(Math.random() * domains.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num > 0 ? num : ''}@${domain}`
}

// Generate a single random ticket
const generateTicket = () => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)]
  const deviceBrand = Math.random() > 0.2 ? deviceBrands[Math.floor(Math.random() * deviceBrands.length)] : undefined
  const deviceModel = deviceBrand && Math.random() > 0.3 ? deviceModels[Math.floor(Math.random() * deviceModels.length)] : undefined
  
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  const priority = priorities[Math.floor(Math.random() * priorities.length)]
  
  // Generate estimated cost (50% chance)
  const estimatedCost = Math.random() > 0.5 
    ? Math.floor(50 + Math.random() * 950) // 50-1000 BGN
    : undefined

  // Generate estimated completion date (60% chance, more likely for in-progress tickets)
  const estimatedCompletionDate = (status === 'in_progress' || status === 'pending') && Math.random() > 0.4
    ? randomFutureDate(30)
    : undefined

  // Generate notes (30% chance)
  const ticketNotes = Math.random() > 0.7 
    ? notes[Math.floor(Math.random() * notes.length)]
    : undefined

  // Generate actual cost for completed tickets (80% chance, should be close to estimated)
  const actualCost = status === 'completed' && Math.random() > 0.2
    ? estimatedCost 
      ? Math.floor(estimatedCost * (0.8 + Math.random() * 0.4)) // ±20% variation
      : Math.floor(50 + Math.random() * 950)
    : undefined

  // Generate ticket creation date (within last 180 days)
  const createdAt = randomDateInRange(180)

  // Generate actual completion date for completed tickets
  // Completion date should be after creation date, but not in the future
  const actualCompletionDate = status === 'completed'
    ? (() => {
        const completionDate = new Date(createdAt)
        // Add 1-30 days after creation, but ensure it doesn't exceed today
        const daysAfterCreation = Math.floor(Math.random() * 30) + 1
        completionDate.setDate(completionDate.getDate() + daysAfterCreation)
        
        // If completion date is in the future, cap it to today
        const today = new Date()
        if (completionDate > today) {
          completionDate.setTime(today.getTime())
        }
        
        return completionDate.toISOString().split('T')[0]
      })()
    : undefined

  return {
    customerName: `${firstName} ${lastName}`,
    customerEmail: randomEmail(firstName, lastName),
    customerPhone: randomPhone(),
    deviceType,
    deviceBrand,
    deviceModel,
    issueDescription: issueDescriptions[Math.floor(Math.random() * issueDescriptions.length)],
    status,
    priority,
    estimatedCost,
    actualCost,
    estimatedCompletionDate,
    actualCompletionDate,
    notes: ticketNotes || undefined,
    createdAt,
  }
}

// Generate random expenses for a ticket
const generateExpenses = (ticketId: string, ticketCreatedAt: Date, ticketCost?: number): Array<{
  ticketId: string
  name: string
  quantity: Decimal
  price: Decimal
  createdAt: Date
}> => {
  // 40% chance of having expenses, more likely for in_progress or completed tickets
  if (Math.random() > 0.6) {
    const expenseCount = Math.floor(Math.random() * 3) + 1 // 1-3 expenses
    const expenses = []
    
    for (let i = 0; i < expenseCount; i++) {
      const name = expenseNames[Math.floor(Math.random() * expenseNames.length)]
      const quantity = new Decimal(Math.floor(Math.random() * 3) + 1) // 1-3 quantity
      // Price varies, but if we have ticket cost, distribute it across expenses
      const basePrice = ticketCost && expenseCount > 0
        ? (ticketCost / expenseCount) * (0.7 + Math.random() * 0.6)
        : Math.floor(10 + Math.random() * 490) // 10-500 BGN
      const price = new Decimal(basePrice.toFixed(2))
      
      expenses.push({
        ticketId,
        name,
        quantity,
        price,
        createdAt: ticketCreatedAt, // Use the same date as the ticket
      })
    }
    
    return expenses
  }
  
  return []
}

async function seedTickets() {
  try {
    console.log('Checking existing tickets...')
    const existingCount = await db.repairTicket.count()
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing tickets in the database.`)
      console.log('⚠️  Warning: This will add 100 more tickets.')
      console.log('Continuing with ticket generation...')
    }
    
    console.log('Generating 100 tickets...')
    const tickets = Array.from({ length: 100 }, () => generateTicket())
    
    // Helper function to get or create a customer
    const getOrCreateCustomer = async (
      name: string,
      email: string,
      phone: string
    ): Promise<string> => {
      // Try to find existing customer by email (case-insensitive)
      const existing = await db.customer.findFirst({
        where: {
          email: {
            equals: email.toLowerCase(),
            mode: 'insensitive',
          },
        },
      })

      if (existing) {
        // Update customer info if it has changed
        await db.customer.update({
          where: { id: existing.id },
          data: {
            name,
            phone,
          },
        })

        return existing.id
      }

      // Create new customer
      const newCustomer = await db.customer.create({
        data: {
          name,
          email: email.toLowerCase(),
          phone,
        },
      })

      return newCustomer.id
    }
    
    console.log('Inserting tickets into database...')
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < tickets.length; i++) {
      try {
        const ticket = tickets[i]
        const ticketNumber = generateTicketNumber()
        
        // Get or create customer
        const customerId = await getOrCreateCustomer(
          ticket.customerName,
          ticket.customerEmail,
          ticket.customerPhone
        )
        
        const createdTicket = await db.repairTicket.create({
          data: {
            ticketNumber,
            customerId,
            deviceType: ticket.deviceType,
            deviceBrand: ticket.deviceBrand || null,
            deviceModel: ticket.deviceModel || null,
            issueDescription: ticket.issueDescription,
            status: ticket.status,
            priority: ticket.priority || 'medium',
            estimatedCost: ticket.estimatedCost ? new Decimal(ticket.estimatedCost.toString()) : null,
            actualCost: ticket.actualCost ? new Decimal(ticket.actualCost.toString()) : null,
            estimatedCompletionDate: ticket.estimatedCompletionDate ? new Date(ticket.estimatedCompletionDate) : null,
            actualCompletionDate: ticket.actualCompletionDate ? new Date(ticket.actualCompletionDate) : null,
            notes: ticket.notes || null,
            createdAt: ticket.createdAt, // Set the ticket creation date explicitly
          },
        })

        // Create expenses for some tickets (with same date as ticket)
        const expenses = generateExpenses(
          createdTicket.id,
          ticket.createdAt, // Pass the ticket's creation date
          ticket.actualCost || ticket.estimatedCost || undefined
        )
        
        if (expenses.length > 0) {
          await db.expense.createMany({
            data: expenses,
          })
        }
        
        successCount++
        if ((i + 1) % 10 === 0) {
          console.log(`Progress: ${i + 1}/100 tickets inserted...`)
        }
      } catch (error) {
        console.error(`Error inserting ticket ${i + 1}:`, error)
        errorCount++
      }
    }
    
    console.log('\n✅ Ticket seeding completed!')
    console.log(`Successfully inserted: ${successCount} tickets`)
    if (errorCount > 0) {
      console.log(`Errors: ${errorCount} tickets`)
    }
    
    // Close database connection
    await db.$disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Error seeding tickets:', error)
    await db.$disconnect()
    process.exit(1)
  }
}

seedTickets()

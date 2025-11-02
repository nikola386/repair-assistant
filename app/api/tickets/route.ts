import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { CreateTicketInput, TicketPriority } from '@/types/ticket'
import { withAuth } from '@/lib/auth.middleware'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const authResult = await withAuth(request, { action: 'ticket list access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session
  
  // Get user's storeId
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Fetching tickets', { userId: session.user.id, storeId: user.storeId }, requestId)
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Use pagination if page or limit is provided, otherwise use getAll
    if (searchParams.has('page') || searchParams.has('limit') || search || status || priority) {
      const result = await ticketStorage.getPaginated(user.storeId, page, limit, search, status, priority)
      const duration = Date.now() - startTime
      logger.info('Tickets fetched successfully', { count: result.tickets?.length || 0, page, limit, duration }, requestId)
      return NextResponse.json(result, { status: 200 })
    }
    
    // Default behavior: return all tickets for the store
    const tickets = await ticketStorage.getAll(user.storeId)
    const duration = Date.now() - startTime
    logger.info('All tickets fetched successfully', { count: tickets.length, duration }, requestId)
    return NextResponse.json({ tickets }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching tickets', error, requestId)
    logger.error('Error fetching tickets details', { duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const authResult = await withAuth(request, { action: 'ticket creation' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    logger.info('Creating new ticket', { userId: session.user.id }, requestId)
    const body = await request.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      deviceType,
      deviceBrand,
      deviceModel,
      issueDescription,
      priority,
      estimatedCost,
      estimatedCompletionDate,
      notes,
    } = body

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !deviceType || !issueDescription) {
      logger.warn('Ticket creation validation failed: missing required fields', {
        hasName: !!customerName,
        hasEmail: !!customerEmail,
        hasPhone: !!customerPhone,
        hasDeviceType: !!deviceType,
        hasDescription: !!issueDescription,
      }, requestId)
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      logger.warn('Ticket creation validation failed: invalid email format', { email: customerEmail }, requestId)
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate priority if provided
    const validPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
    const validatedPriority: TicketPriority | undefined = priority && validPriorities.includes(priority as TicketPriority)
      ? (priority as TicketPriority)
      : undefined

    const ticketInput: CreateTicketInput = {
      customerName,
      customerEmail,
      customerPhone,
      deviceType,
      deviceBrand,
      deviceModel,
      issueDescription,
      priority: validatedPriority,
      estimatedCost,
      estimatedCompletionDate,
      notes,
    }

    const ticket = await ticketStorage.create(ticketInput)
    const duration = Date.now() - startTime
    logger.info('Ticket created successfully', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, duration }, requestId)

    return NextResponse.json(
      { ticket, message: 'Ticket created successfully' },
      { status: 201 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error creating ticket', error, requestId)
    logger.error('Error creating ticket details', { duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


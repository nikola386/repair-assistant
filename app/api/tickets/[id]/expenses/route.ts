import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { CreateExpenseInput, UpdateExpenseInput } from '@/types/ticket'
import { withAuth } from '@/lib/auth.middleware'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const authResult = await withAuth(request, { ticketId: params.id, action: 'expense access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  // Get user's storeId and verify ticket belongs to store
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  // Verify ticket belongs to store
  const ticket = await ticketStorage.getById(params.id, user.storeId)
  if (!ticket) {
    logger.warn('Ticket not found', { ticketId: params.id, storeId: user.storeId }, requestId)
    return NextResponse.json(
      { error: 'Ticket not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Fetching expenses for ticket', { ticketId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const expenses = await ticketStorage.getExpensesByTicketId(params.id)
    
    const duration = Date.now() - startTime
    logger.info('Expenses fetched successfully', { ticketId: params.id, count: expenses.length, duration }, requestId)
    return NextResponse.json({ expenses }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching expenses', error, requestId)
    logger.error('Error fetching expenses details', { ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const authResult = await withAuth(request, { ticketId: params.id, action: 'expense creation' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  // Get user's storeId and verify ticket belongs to store
  const user = await userStorage.findById(session.user.id)
  if (!user || !user.storeId) {
    logger.error('User or store not found', { userId: session.user.id }, requestId)
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  // Verify ticket belongs to store
  const ticket = await ticketStorage.getById(params.id, user.storeId)
  if (!ticket) {
    logger.warn('Ticket not found for expense creation', { ticketId: params.id, storeId: user.storeId }, requestId)
    return NextResponse.json(
      { error: 'Ticket not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Creating expense', { ticketId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const body = await request.json()
    const { name, quantity, price } = body

    // Validate required fields
    if (!name || quantity === undefined || price === undefined) {
      logger.warn('Expense creation validation failed: missing required fields', {
        hasName: !!name,
        hasQuantity: quantity !== undefined,
        hasPrice: price !== undefined,
      }, requestId)
      return NextResponse.json(
        { error: 'Missing required fields: name, quantity, and price are required' },
        { status: 400 }
      )
    }

    // Validate numeric fields
    const numQuantity = parseFloat(quantity)
    const numPrice = parseFloat(price)

    if (isNaN(numQuantity) || numQuantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be a valid positive number' },
        { status: 400 }
      )
    }

    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json(
        { error: 'Price must be a valid positive number' },
        { status: 400 }
      )
    }

    const expenseInput: CreateExpenseInput = {
      ticketId: params.id,
      name: name.trim(),
      quantity: numQuantity,
      price: numPrice,
    }

    const expense = await ticketStorage.createExpense(expenseInput)
    const duration = Date.now() - startTime
    logger.info('Expense created successfully', { expenseId: expense.id, ticketId: params.id, duration }, requestId)

    return NextResponse.json(
      { expense, message: 'Expense created successfully' },
      { status: 201 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error creating expense', error, requestId)
    logger.error('Error creating expense details', { ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


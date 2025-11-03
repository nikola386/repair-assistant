import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { UpdateExpenseInput } from '@/types/ticket'
import { withAuth } from '@/lib/auth.middleware'
import { logger, generateRequestId } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const authResult = await withAuth(request, { ticketId: params.id, action: 'expense update' })
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
    logger.warn('Ticket not found for expense update', { ticketId: params.id, storeId: user.storeId }, requestId)
    return NextResponse.json(
      { error: 'Ticket not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Updating expense', { expenseId: params.expenseId, ticketId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const body = await request.json()
    const { name, quantity, price } = body

    // Validate numeric fields if provided
    const updateInput: UpdateExpenseInput = {}

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      updateInput.name = name.trim()
    }

    if (quantity !== undefined) {
      const numQuantity = parseFloat(quantity)
      if (isNaN(numQuantity) || numQuantity < 0) {
        return NextResponse.json(
          { error: 'Quantity must be a valid positive number' },
          { status: 400 }
        )
      }
      updateInput.quantity = numQuantity
    }

    if (price !== undefined) {
      const numPrice = parseFloat(price)
      if (isNaN(numPrice) || numPrice < 0) {
        return NextResponse.json(
          { error: 'Price must be a valid positive number' },
          { status: 400 }
        )
      }
      updateInput.price = numPrice
    }

    // Verify expense belongs to ticket before updating
    const existingExpense = await ticketStorage.getExpenseById(params.expenseId)
    if (!existingExpense || existingExpense.ticketId !== params.id) {
      logger.warn('Expense not found or does not belong to ticket', { expenseId: params.expenseId, ticketId: params.id }, requestId)
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    const expense = await ticketStorage.updateExpense(params.expenseId, updateInput)
    
    if (!expense) {
      logger.warn('Expense not found for update', { expenseId: params.expenseId }, requestId)
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Expense updated successfully', { expenseId: params.expenseId, ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { expense, message: 'Expense updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating expense', error, requestId)
    logger.error('Error updating expense details', { expenseId: params.expenseId, ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const authResult = await withAuth(request, { ticketId: params.id, action: 'expense deletion' })
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
    logger.warn('Ticket not found for expense deletion', { ticketId: params.id, storeId: user.storeId }, requestId)
    return NextResponse.json(
      { error: 'Ticket not found' },
      { status: 404 }
    )
  }

  try {
    logger.info('Deleting expense', { expenseId: params.expenseId, ticketId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    
    // Verify expense belongs to ticket before deleting
    const existingExpense = await ticketStorage.getExpenseById(params.expenseId)
    if (!existingExpense || existingExpense.ticketId !== params.id) {
      logger.warn('Expense not found or does not belong to ticket', { expenseId: params.expenseId, ticketId: params.id }, requestId)
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }
    
    const deleted = await ticketStorage.deleteExpense(params.expenseId)
    
    if (!deleted) {
      logger.warn('Expense not found for deletion', { expenseId: params.expenseId }, requestId)
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Expense deleted successfully', { expenseId: params.expenseId, ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { message: 'Expense deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error deleting expense', error, requestId)
    logger.error('Error deleting expense details', { expenseId: params.expenseId, ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


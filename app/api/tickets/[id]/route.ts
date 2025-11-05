import { NextRequest, NextResponse } from 'next/server'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { UpdateTicketInput, TicketStatus, TicketPriority } from '@/types/ticket'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { logger, generateRequestId } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const { session, response } = await requireAuthAndPermission(request, Permission.VIEW_TICKETS)
  if (response) return response

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
    logger.info('Fetching ticket by ID', { ticketId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const ticket = await ticketStorage.getById(params.id, user.storeId)
    
    if (!ticket) {
      logger.warn('Ticket not found', { ticketId: params.id }, requestId)
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Ticket fetched successfully', { ticketId: params.id, ticketNumber: ticket.ticketNumber, duration }, requestId)
    return NextResponse.json({ ticket }, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching ticket', error, requestId)
    logger.error('Error fetching ticket details', { ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const { session, response } = await requireAuthAndPermission(request, Permission.EDIT_TICKETS)
  if (response) return response

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
    logger.info('Updating ticket', { ticketId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const body = await request.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      deviceType,
      deviceBrand,
      deviceModel,
      deviceSerialNumber,
      issueDescription,
      status,
      priority,
      estimatedCost,
      actualCost,
      estimatedCompletionDate,
      actualCompletionDate,
      notes,
    } = body

    // Validate status if provided
    const validStatuses: TicketStatus[] = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled']
    const validPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
    
    const validatedStatus: TicketStatus | undefined = status && validStatuses.includes(status as TicketStatus) 
      ? (status as TicketStatus) 
      : undefined
    const validatedPriority: TicketPriority | undefined = priority && validPriorities.includes(priority as TicketPriority)
      ? (priority as TicketPriority)
      : undefined

    const updateInput: UpdateTicketInput = {
      ...(customerName !== undefined && { customerName }),
      ...(customerEmail !== undefined && { customerEmail }),
      ...(customerPhone !== undefined && { customerPhone }),
      ...(deviceType !== undefined && { deviceType }),
      ...(deviceBrand !== undefined && { deviceBrand }),
      ...(deviceModel !== undefined && { deviceModel }),
      ...(deviceSerialNumber !== undefined && { deviceSerialNumber }),
      ...(issueDescription !== undefined && { issueDescription }),
      ...(validatedStatus && { status: validatedStatus }),
      ...(validatedPriority && { priority: validatedPriority }),
      ...(estimatedCost !== undefined && { estimatedCost }),
      ...(actualCost !== undefined && { actualCost }),
      ...(estimatedCompletionDate && { estimatedCompletionDate }),
      ...(actualCompletionDate && { actualCompletionDate }),
      ...(notes !== undefined && { notes }),
    }

    const ticket = await ticketStorage.update(params.id, updateInput, user.storeId)
    
    if (!ticket) {
      logger.warn('Ticket not found for update', { ticketId: params.id, storeId: user.storeId }, requestId)
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Ticket updated successfully', { ticketId: params.id, ticketNumber: ticket.ticketNumber, duration }, requestId)
    return NextResponse.json(
      { ticket, message: 'Ticket updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating ticket', error, requestId)
    logger.error('Error updating ticket details', { ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const { session, response } = await requireAuthAndPermission(request, Permission.DELETE_TICKETS)
  if (response) return response

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
    logger.info('Deleting ticket', { ticketId: params.id, userId: session.user.id, storeId: user.storeId }, requestId)
    const deleted = await ticketStorage.delete(params.id, user.storeId)
    
    if (!deleted) {
      logger.warn('Ticket not found for deletion', { ticketId: params.id }, requestId)
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    const duration = Date.now() - startTime
    logger.info('Ticket deleted successfully', { ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { message: 'Ticket deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error deleting ticket', error, requestId)
    logger.error('Error deleting ticket details', { ticketId: params.id, duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


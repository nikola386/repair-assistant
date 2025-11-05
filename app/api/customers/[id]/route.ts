import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { logger, generateRequestId } from '@/lib/logger'
import { ticketStorage } from '@/lib/ticketStorage'
import { TicketStatus, TicketPriority } from '@/types/ticket'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const { session, response } = await requireAuthAndPermission(request, Permission.VIEW_CUSTOMERS)
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
    const customerId = params.id

    logger.info('Fetching customer details', { userId: session.user.id, customerId, storeId: user.storeId }, requestId)

    // Get customer with ticket count - ensure it belongs to the store
    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        storeId: user.storeId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            repairTickets: true,
          },
        },
      },
    })

    if (!customer) {
      logger.warn('Customer not found', { customerId }, requestId)
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get all tickets for this customer - ensure they belong to the store
    const ticketsData = await db.repairTicket.findMany({
      where: {
        customerId,
        storeId: user.storeId,
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Load images for tickets
    const ticketsWithImages = await Promise.all(
      ticketsData.map(async (ticket) => {
        const images = await ticketStorage.getImagesByTicketId(ticket.id)
        return {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          customerId: ticket.customerId,
          customerName: ticket.customer.name,
          customerEmail: ticket.customer.email,
          customerPhone: ticket.customer.phone,
          deviceType: ticket.deviceType,
          deviceBrand: ticket.deviceBrand || undefined,
          deviceModel: ticket.deviceModel || undefined,
          issueDescription: ticket.issueDescription,
          status: ticket.status as TicketStatus,
          priority: ticket.priority as TicketPriority,
          estimatedCost: ticket.estimatedCost ? Number(ticket.estimatedCost) : undefined,
          actualCost: ticket.actualCost ? Number(ticket.actualCost) : undefined,
          estimatedCompletionDate: ticket.estimatedCompletionDate
            ? ticket.estimatedCompletionDate.toISOString().split('T')[0]
            : undefined,
          actualCompletionDate: ticket.actualCompletionDate
            ? ticket.actualCompletionDate.toISOString().split('T')[0]
            : undefined,
          notes: ticket.notes || undefined,
          images,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
        }
      })
    )

    const duration = Date.now() - startTime
    logger.info('Customer details fetched successfully', { customerId, ticketCount: ticketsWithImages.length, duration }, requestId)

    return NextResponse.json(
      {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          ticketCount: customer._count.repairTickets,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
        },
        tickets: ticketsWithImages,
      },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching customer details', error, requestId)
    logger.error('Error fetching customer details info', { duration }, requestId)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


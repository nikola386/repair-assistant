import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import ServiceReportPDF from '@/components/reports/ServiceReportPDF'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAuth(request, { action: 'generate service report' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    // Get user and store info
    const user = await userStorage.findById(session.user.id)
    if (!user || !user.storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    // Get ticket
    const ticket = await ticketStorage.getById(params.id, user.storeId)
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Get store information
    const store = await db.store.findUnique({
      where: { id: user.storeId },
      select: {
        name: true,
        address: true,
        street: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        phone: true,
        email: true,
        website: true,
        vatNumber: true,
        currency: true,
      },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Ensure expenses are loaded
    if (!ticket.expenses) {
      ticket.expenses = await ticketStorage.getExpensesByTicketId(ticket.id)
    }

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(ServiceReportPDF, { ticket, store })
    )

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="service-report-${ticket.ticketNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating service report PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate service report' },
      { status: 500 }
    )
  }
}


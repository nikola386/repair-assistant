import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { ticketStorage } from '@/lib/ticketStorage'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import InvoicePDF from '@/components/reports/InvoicePDF'
import { ensurePdfFontsRegistered } from '@/lib/pdfFonts'
import { settingsStorage } from '@/lib/settingsStorage'
import { getPdfTranslations } from '@/lib/pdfTranslations'
import { isValidLanguage } from '@/lib/languages'
import { Decimal } from '@prisma/client/runtime/library'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAuth(request, { action: 'generate invoice' })
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
        logo: true,
        taxEnabled: true,
        taxRate: true,
        taxInclusive: true,
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

    // Get language from settings
    const settings = await settingsStorage.findByStoreId(user.storeId)
    const language = (settings?.language && isValidLanguage(settings.language)) ? settings.language : 'en'
    const translations = getPdfTranslations(language)

    // Ensure fonts are registered before rendering
    await ensurePdfFontsRegistered()

    // Convert taxRate from Decimal to number if it exists
    const storeWithTaxRate = {
      ...store,
      taxRate: store.taxRate instanceof Decimal ? store.taxRate.toNumber() : store.taxRate ?? null,
    }

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, { ticket, store: storeWithTaxRate, translations, language })
    )

    // Convert Buffer to Uint8Array for NextResponse
    const pdfArray = new Uint8Array(pdfBuffer)

    // Return PDF as response
    return new NextResponse(pdfArray, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${ticket.ticketNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth.middleware'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import BusinessReportPDF from '@/components/reports/BusinessReportPDF'
import { Prisma } from '@prisma/client'
import { ensurePdfFontsRegistered } from '@/lib/pdfFonts'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

function getDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, { action: 'generate business report' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    // Get user's store ID
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const { start, end } = getDateRange(startDate, endDate)

    // Get store information
    const store = await (db as any).store.findUnique({
      where: { id: storeId },
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

    // Get all tickets in the date range
    const tickets = await (db as any).repairTicket.findMany({
      where: {
        storeId: storeId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        customer: true,
        expenses: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as Array<{
      id: string
      status: string
      actualCost: Prisma.Decimal | null
      estimatedCost: Prisma.Decimal | null
      actualCompletionDate: Date | null
      createdAt: Date
      customerId: string
      deviceType: string
      customer: { name: string; email: string }
      expenses: Array<{ quantity: Prisma.Decimal; price: Prisma.Decimal }>
    }>

    // Calculate summary statistics
    const totalRepairs = tickets.length
    const completedRepairs = tickets.filter(t => t.status === 'completed').length
    const inProgressRepairs = tickets.filter(t => t.status === 'in_progress').length
    const waitingRepairs = tickets.filter(t => t.status === 'pending' || t.status === 'waiting_parts').length
    const cancelledRepairs = tickets.filter(t => t.status === 'cancelled').length

    // Calculate income (from completed tickets)
    const completedTickets = tickets.filter(t => t.status === 'completed')
    let income = 0
    for (const ticket of completedTickets) {
      const cost = ticket.actualCost ? ticket.actualCost.toNumber() : (ticket.estimatedCost ? ticket.estimatedCost.toNumber() : 0)
      income += cost
    }

    // Calculate expenses
    let totalExpenses = 0
    for (const ticket of completedTickets) {
      for (const expense of ticket.expenses) {
        const amount = expense.quantity.toNumber() * expense.price.toNumber()
        totalExpenses += amount
      }
    }

    const grossProfit = income - totalExpenses
    const grossProfitPercentage = income > 0 ? (grossProfit / income) * 100 : 0

    // Calculate average repair time
    let totalRepairTime = 0
    let completedCount = 0
    for (const ticket of completedTickets) {
      const completionDate = ticket.actualCompletionDate || new Date()
      const createdDate = ticket.createdAt
      const diffTime = completionDate.getTime() - createdDate.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      if (diffDays > 0) {
        totalRepairTime += diffDays
        completedCount++
      }
    }
    const averageRepairTime = completedCount > 0 ? totalRepairTime / completedCount : 0

    // Calculate completion rate
    const completionRate = totalRepairs > 0 ? (completedRepairs / totalRepairs) * 100 : 0

    // Group by device type
    const deviceTypeMap = new Map<string, { count: number; revenue: number; expenses: number }>()
    
    for (const ticket of completedTickets) {
      const deviceType = ticket.deviceType || 'Unknown'
      const revenue = ticket.actualCost ? ticket.actualCost.toNumber() : (ticket.estimatedCost ? ticket.estimatedCost.toNumber() : 0)
      
      let expenses = 0
      for (const expense of ticket.expenses) {
        expenses += expense.quantity.toNumber() * expense.price.toNumber()
      }

      const existing = deviceTypeMap.get(deviceType)
      if (existing) {
        existing.count += 1
        existing.revenue += revenue
        existing.expenses += expenses
      } else {
        deviceTypeMap.set(deviceType, { count: 1, revenue, expenses })
      }
    }

    const byDeviceType = Array.from(deviceTypeMap.entries())
      .map(([deviceType, data]) => ({
        deviceType,
        count: data.count,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    // Calculate top customers
    const customerMap = new Map<string, { name: string; email: string; ticketCount: number; totalSpent: number }>()
    
    for (const ticket of completedTickets) {
      const customerId = ticket.customerId
      const customer = ticket.customer
      const revenue = ticket.actualCost ? ticket.actualCost.toNumber() : (ticket.estimatedCost ? ticket.estimatedCost.toNumber() : 0)

      const existing = customerMap.get(customerId)
      if (existing) {
        existing.ticketCount += 1
        existing.totalSpent += revenue
      } else {
        customerMap.set(customerId, {
          name: customer.name,
          email: customer.email,
          ticketCount: 1,
          totalSpent: revenue,
        })
      }
    }

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10) // Top 10 customers

    // Format period label
    const periodLabel = startDate === endDate 
      ? formatDate(startDate)
      : `${formatDate(startDate)} to ${formatDate(endDate)}`

    // Prepare report data
    const reportData = {
      period: {
        startDate,
        endDate,
        label: periodLabel,
      },
      summary: {
        totalRepairs,
        completedRepairs,
        inProgressRepairs,
        waitingRepairs,
        cancelledRepairs,
        income: Math.round(income * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossProfitPercentage: Math.round(grossProfitPercentage * 100) / 100,
        averageRepairTime: Math.round(averageRepairTime * 10) / 10,
        completionRate: Math.round(completionRate * 100) / 100,
      },
      byDeviceType,
      topCustomers,
    }

    // Ensure fonts are registered before rendering
    await ensurePdfFontsRegistered()

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(BusinessReportPDF, { store, reportData }) as React.ReactElement
    )

    // Convert Buffer to Uint8Array for NextResponse
    const pdfArray = new Uint8Array(pdfBuffer)

    // Return PDF as response
    const filename = `business-report-${startDate}-to-${endDate}.pdf`
    return new NextResponse(pdfArray, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating business report PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate business report' },
      { status: 500 }
    )
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}


import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth.middleware'
import { logger, generateRequestId } from '@/lib/logger'
import { Decimal } from '@prisma/client/runtime/library'

interface DashboardStats {
  totalRepairs: number
  inProgressRepairs: number
  waitingRepairs: number
  income: number
  expenses: number
  grossProfit: number
  grossProfitPercentage: number
  averageRepairTime: number
  completionRate: number
  chartData: ChartDataPoint[]
}

interface ChartDataPoint {
  date: string
  income: number
  expenses: number
  profit: number
  profitPercentage: number
}

function getDateRange(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function generateChartData(
  days: number,
  completedTickets: Array<{
    id: string
    actualCost: Decimal | null
    estimatedCost: Decimal | null
    actualCompletionDate: Date | null
    createdAt: Date
  }>,
  expenses: Array<{
    quantity: Decimal
    price: Decimal
    createdAt: Date
    ticketId: string
  }>
): ChartDataPoint[] {
  // Determine interval based on period length
  let intervalDays = 1 // Daily for 7d and 30d
  if (days > 30 && days <= 180) {
    intervalDays = 7 // Weekly for 180d
  } else if (days > 180) {
    intervalDays = 30 // Monthly for 360d
  }

  // Generate date buckets
  const now = new Date()
  const dataPoints: ChartDataPoint[] = []
  const dataMap = new Map<string, { income: number; expenses: number }>()

  // Initialize all date buckets with zeros
  for (let i = days; i >= 0; i -= intervalDays) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    let dateKey: string
    if (intervalDays === 1) {
      dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    } else if (intervalDays === 7) {
      // Get start of week (Monday)
      const weekStart = new Date(date)
      const dayOfWeek = weekStart.getDay()
      const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      weekStart.setDate(diff)
      weekStart.setHours(0, 0, 0, 0)
      dateKey = weekStart.toISOString().split('T')[0]
    } else {
      // Monthly
      dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }
    
    dataMap.set(dateKey, { income: 0, expenses: 0 })
  }

  // Aggregate income by completion date (or creation date if no completion date)
  for (const ticket of completedTickets) {
    const completionDate = ticket.actualCompletionDate || ticket.createdAt
    const cost = ticket.actualCost ? ticket.actualCost.toNumber() : (ticket.estimatedCost ? ticket.estimatedCost.toNumber() : 0)
    
    if (cost > 0) {
      const date = new Date(completionDate)
      date.setHours(0, 0, 0, 0)
      
      let dateKey: string
      if (intervalDays === 1) {
        dateKey = date.toISOString().split('T')[0]
      } else if (intervalDays === 7) {
        const weekStart = new Date(date)
        const dayOfWeek = weekStart.getDay()
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        weekStart.setDate(diff)
        weekStart.setHours(0, 0, 0, 0)
        dateKey = weekStart.toISOString().split('T')[0]
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      const existing = dataMap.get(dateKey)
      if (existing) {
        existing.income += cost
      }
    }
  }

  // Aggregate expenses by creation date
  for (const expense of expenses) {
    const date = new Date(expense.createdAt)
    date.setHours(0, 0, 0, 0)
    const amount = expense.quantity.toNumber() * expense.price.toNumber()
    
    let dateKey: string
    if (intervalDays === 1) {
      dateKey = date.toISOString().split('T')[0]
    } else if (intervalDays === 7) {
      const weekStart = new Date(date)
      const dayOfWeek = weekStart.getDay()
      const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      weekStart.setDate(diff)
      weekStart.setHours(0, 0, 0, 0)
      dateKey = weekStart.toISOString().split('T')[0]
    } else {
      dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }
    
    const existing = dataMap.get(dateKey)
    if (existing) {
      existing.expenses += amount
    }
  }

  // Convert map to array and calculate profit and profit percentage
  for (const [dateKey, values] of dataMap.entries()) {
    const profit = Math.round((values.income - values.expenses) * 100) / 100
    const profitPercentage = values.income > 0 ? Math.round((profit / values.income) * 100 * 100) / 100 : 0
    
    dataPoints.push({
      date: dateKey,
      income: Math.round(values.income * 100) / 100,
      expenses: Math.round(values.expenses * 100) / 100,
      profit: profit,
      profitPercentage: profitPercentage,
    })
  }

  // Sort by date
  dataPoints.sort((a, b) => a.date.localeCompare(b.date))

  return dataPoints
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()

  const authResult = await withAuth(request, { action: 'dashboard stats access' })
  if (authResult.response) {
    return authResult.response
  }
  const session = authResult.session

  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30d'

    // Parse period
    let days = 30
    switch (period) {
      case '7d':
        days = 7
        break
      case '30d':
        days = 30
        break
      case '180d':
        days = 180
        break
      case '360d':
        days = 360
        break
      default:
        days = 30
    }

    const startDate = getDateRange(days)

    logger.info('Fetching dashboard stats', { userId: session.user.id, period, days }, requestId)

    // Build where clause for date filtering
    const dateFilter = {
      createdAt: {
        gte: startDate,
      },
    }

    // Get all tickets in the date range
    const tickets = await db.repairTicket.findMany({
      where: dateFilter,
      select: {
        id: true,
        status: true,
        actualCost: true,
        estimatedCost: true,
        actualCompletionDate: true,
        createdAt: true,
      },
    })

    // Filter to only completed tickets for income and profit calculations
    const completedTickets = tickets.filter((t: typeof tickets[0]) => t.status === 'completed')
    const completedTicketIds = completedTickets.map(t => t.id)

    // Get expenses only for completed tickets in the date range, with creation date
    const expenses = completedTicketIds.length > 0 
      ? await db.expense.findMany({
          where: {
            ticketId: {
              in: completedTicketIds,
            },
          },
          select: {
            quantity: true,
            price: true,
            createdAt: true,
            ticketId: true,
          },
        })
      : []

    // Calculate statistics with default values of 0
    const totalRepairs = tickets.length || 0
    const inProgressRepairs = tickets.filter((t: typeof tickets[0]) => t.status === 'in_progress').length || 0
    const waitingRepairs = tickets.filter((t: typeof tickets[0]) => t.status === 'pending' || t.status === 'waiting_parts').length || 0

    // Calculate income: sum of actualCost (or estimatedCost if actualCost is null) for completed tickets only
    let income = 0
    for (const ticket of completedTickets) {
      // For completed tickets, prefer actualCost, fall back to estimatedCost
      const cost = ticket.actualCost ? ticket.actualCost.toNumber() : (ticket.estimatedCost ? ticket.estimatedCost.toNumber() : 0)
      income += cost
    }

    // Calculate expenses: sum of all expense amounts (quantity * price) for completed tickets only
    let totalExpenses = 0
    for (const expense of expenses) {
      const amount = expense.quantity.toNumber() * expense.price.toNumber()
      totalExpenses += amount
    }

    // Gross profit = Income - Expenses
    const grossProfit = income - totalExpenses

    // Gross profit percentage = (Gross Profit / Income) * 100
    // Avoid division by zero
    const grossProfitPercentage = income > 0 ? (grossProfit / income) * 100 : 0

    // Calculate Average Repair Time (in days) for completed tickets
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

    // Calculate Completion Rate (percentage of completed tickets)
    const completionRate = totalRepairs > 0 ? (completedTickets.length / totalRepairs) * 100 : 0

    // Generate chart data (time-series)
    const chartData = generateChartData(days, completedTickets, expenses)

    const stats: DashboardStats = {
      totalRepairs: totalRepairs || 0,
      inProgressRepairs: inProgressRepairs || 0,
      waitingRepairs: waitingRepairs || 0,
      income: Math.round((income || 0) * 100) / 100, // Round to 2 decimal places
      expenses: Math.round((totalExpenses || 0) * 100) / 100,
      grossProfit: Math.round((grossProfit || 0) * 100) / 100,
      grossProfitPercentage: Math.round((grossProfitPercentage || 0) * 100) / 100,
      averageRepairTime: Math.round((averageRepairTime || 0) * 10) / 10, // Round to 1 decimal place
      completionRate: Math.round((completionRate || 0) * 100) / 100,
      chartData,
    }

    const duration = Date.now() - startTime
    logger.info('Dashboard stats fetched successfully', { period, duration }, requestId)

    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching dashboard stats', { error, duration }, requestId)
    // Return default zero values instead of failing
    const defaultStats: DashboardStats = {
      totalRepairs: 0,
      inProgressRepairs: 0,
      waitingRepairs: 0,
      income: 0,
      expenses: 0,
      grossProfit: 0,
      grossProfitPercentage: 0,
      averageRepairTime: 0,
      completionRate: 0,
      chartData: [],
    }
    return NextResponse.json(defaultStats, { status: 200 })
  }
}


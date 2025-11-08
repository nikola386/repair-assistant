import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userStorage } from '@/lib/userStorage'
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
  overdueTickets: number
  highPriorityTickets: number
  totalClients: number
  revenueGrowth: number | null // Percentage change from previous period
  lowStockItems: number
  statusDistribution: StatusDistributionItem[]
}

interface StatusDistributionItem {
  status: string
  count: number
  percentage: number
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
    inventoryItemId: string | null
    inventoryItem: {
      costPrice: Decimal | null
    } | null
  }>
): ChartDataPoint[] {
  let intervalDays = 1
  if (days > 30 && days <= 180) {
    intervalDays = 7
  } else if (days > 180) {
    intervalDays = 30
  }

  const now = new Date()
  const dataPoints: ChartDataPoint[] = []
  const dataMap = new Map<string, { income: number; expenses: number }>()

  for (let i = days; i >= 0; i -= intervalDays) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
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
    
    dataMap.set(dateKey, { income: 0, expenses: 0 })
  }

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

  for (const expense of expenses) {
    const date = new Date(expense.createdAt)
    date.setHours(0, 0, 0, 0)
    
    let costPerUnit = expense.price.toNumber()
    if (expense.inventoryItemId && expense.inventoryItem?.costPrice) {
      costPerUnit = expense.inventoryItem.costPrice.toNumber()
    }
    
    const amount = expense.quantity.toNumber() * costPerUnit
    
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

  const storeId = await userStorage.getStoreId(session.user.id)
  if (!storeId) {
    logger.error('User store not found', { userId: session.user.id }, requestId)
    return NextResponse.json(
      { error: 'User store not found' },
      { status: 404 }
    )
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30d'

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

    logger.info('Fetching dashboard stats', { userId: session.user.id, storeId, period, days }, requestId)

    const dateFilter = {
      storeId: storeId,
      createdAt: {
        gte: startDate,
      },
    }

    const tickets = await db.repairTicket.findMany({
      where: dateFilter,
      select: {
        id: true,
        status: true,
        priority: true,
        actualCost: true,
        estimatedCost: true,
        actualCompletionDate: true,
        estimatedCompletionDate: true,
        createdAt: true,
      },
    })

    const completedTickets = tickets.filter((t: typeof tickets[0]) => t.status === 'completed')
    const completedTicketIds = completedTickets.map(t => t.id)

    const expenses = completedTicketIds.length > 0 
      ? await (db as any).expense.findMany({
          where: {
            ticketId: {
              in: completedTicketIds,
            },
          },
          include: {
            inventoryItem: {
              select: {
                costPrice: true,
              },
            },
          },
        })
      : []

    const totalRepairs = tickets.length || 0
    const inProgressRepairs = tickets.filter((t: typeof tickets[0]) => t.status === 'in_progress').length || 0
    const waitingRepairs = tickets.filter((t: typeof tickets[0]) => t.status === 'pending' || t.status === 'waiting_parts').length || 0

    let income = 0
    for (const ticket of completedTickets) {
      const cost = ticket.actualCost ? ticket.actualCost.toNumber() : (ticket.estimatedCost ? ticket.estimatedCost.toNumber() : 0)
      income += cost
    }

    let totalExpenses = 0
    for (const expense of expenses) {
      let costPerUnit = expense.price.toNumber()
      const expenseWithInventory = expense as typeof expense & { inventoryItemId?: string | null; inventoryItem?: { costPrice: Decimal | null } | null }
      if (expenseWithInventory.inventoryItemId && expenseWithInventory.inventoryItem?.costPrice) {
        costPerUnit = expenseWithInventory.inventoryItem.costPrice.toNumber()
      }
      
      const amount = expense.quantity.toNumber() * costPerUnit
      totalExpenses += amount
    }

    const grossProfit = income - totalExpenses

    const grossProfitPercentage = income > 0 ? (grossProfit / income) * 100 : 0

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

    const completionRate = totalRepairs > 0 ? (completedTickets.length / totalRepairs) * 100 : 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const allActiveTickets = await db.repairTicket.findMany({
      where: {
        storeId: storeId as any, // Type assertion for Prisma client
        status: {
          notIn: ['completed', 'cancelled'],
        },
      } as any,
      select: {
        status: true,
        estimatedCompletionDate: true,
      },
    })
    
    const overdueTickets = allActiveTickets.filter((t) => {
      if (!t.estimatedCompletionDate) return false
      const estimatedDate = new Date(t.estimatedCompletionDate)
      estimatedDate.setHours(0, 0, 0, 0)
      return estimatedDate < today
    }).length

    const highPriorityTickets = tickets.filter((t: typeof tickets[0]) => {
      return t.priority === 'high' || t.priority === 'urgent'
    }).length

    const totalClients = await db.customer.count({
      where: {
        storeId: storeId as any,
      } as any,
    })

    const previousPeriodStartDate = getDateRange(days * 2)
    const previousPeriodEndDate = getDateRange(days)
    
    const previousPeriodTickets = await db.repairTicket.findMany({
      where: {
        storeId: storeId as any,
        createdAt: {
          gte: previousPeriodStartDate,
          lt: startDate,
        },
        status: 'completed',
      } as any,
      select: {
        actualCost: true,
        estimatedCost: true,
      },
    })

    let previousPeriodIncome = 0
    for (const ticket of previousPeriodTickets) {
      const cost = ticket.actualCost ? ticket.actualCost.toNumber() : (ticket.estimatedCost ? ticket.estimatedCost.toNumber() : 0)
      previousPeriodIncome += cost
    }
    previousPeriodIncome = Math.round(previousPeriodIncome * 100) / 100

    let revenueGrowth: number | null = null
    if (previousPeriodIncome > 0 && income > 0) {
      revenueGrowth = Math.round(((income - previousPeriodIncome) / previousPeriodIncome) * 100 * 100) / 100
    } else if (previousPeriodIncome === 0 && income > 0) {
      revenueGrowth = 100
    } else if (previousPeriodIncome > 0 && income === 0) {
      revenueGrowth = -100
    }

    const inventoryItems = await (db as any).inventoryItem.findMany({
      where: {
        storeId: storeId
      },
      select: {
        currentQuantity: true,
        minQuantity: true,
      },
    })

    const lowStockItems = inventoryItems.filter((item: { currentQuantity: Decimal; minQuantity: Decimal }) => {
      return item.currentQuantity.toNumber() <= item.minQuantity.toNumber()
    }).length

    const statusCounts = new Map<string, number>()
    const statusOrder = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled']
    
    statusOrder.forEach(status => statusCounts.set(status, 0))
    
    tickets.forEach(ticket => {
      const currentCount = statusCounts.get(ticket.status) || 0
      statusCounts.set(ticket.status, currentCount + 1)
    })
    
    const statusDistribution: StatusDistributionItem[] = statusOrder.map(status => {
      const count = statusCounts.get(status) || 0
      const percentage = totalRepairs > 0 ? Math.round((count / totalRepairs) * 100 * 100) / 100 : 0
      return {
        status,
        count,
        percentage,
      }
    })

    const chartData = generateChartData(days, completedTickets, expenses)

    const stats: DashboardStats = {
      totalRepairs: totalRepairs || 0,
      inProgressRepairs: inProgressRepairs || 0,
      waitingRepairs: waitingRepairs || 0,
      income: Math.round((income || 0) * 100) / 100,
      expenses: Math.round((totalExpenses || 0) * 100) / 100,
      grossProfit: Math.round((grossProfit || 0) * 100) / 100,
      grossProfitPercentage: Math.round((grossProfitPercentage || 0) * 100) / 100,
      averageRepairTime: Math.round((averageRepairTime || 0) * 10) / 10,
      completionRate: Math.round((completionRate || 0) * 100) / 100,
      chartData,
      overdueTickets: overdueTickets || 0,
      highPriorityTickets: highPriorityTickets || 0,
      totalClients: totalClients || 0,
      revenueGrowth: revenueGrowth,
      lowStockItems: lowStockItems || 0,
      statusDistribution: statusDistribution || [],
    }

    const duration = Date.now() - startTime
    logger.info('Dashboard stats fetched successfully', { period, duration }, requestId)

    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching dashboard stats', { error, duration }, requestId)
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
      overdueTickets: 0,
      highPriorityTickets: 0,
      totalClients: 0,
      revenueGrowth: null,
      lowStockItems: 0,
      statusDistribution: [],
    }
    return NextResponse.json(defaultStats, { status: 200 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { db } from '@/lib/db'
import { inventoryStorage } from '@/lib/inventoryStorage'
import { logger, generateRequestId } from '@/lib/logger'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import InventoryReportPDF from '@/components/reports/InventoryReportPDF'
import { ensurePdfFontsRegistered } from '@/lib/pdfFonts'
import { settingsStorage } from '@/lib/settingsStorage'
import { getPdfTranslations } from '@/lib/pdfTranslations'
import { isValidLanguage } from '@/lib/languages'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  const startTime = Date.now()
  
  const { session, response } = await requireAuthAndPermission(request, Permission.EXPORT_REPORTS)
  if (response) return response

  try {
    // Get user's store ID
    const storeId = await userStorage.getStoreId(session.user.id)
    if (!storeId) {
      return NextResponse.json(
        { error: 'User store not found' },
        { status: 404 }
      )
    }

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
        logo: true,
      },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Get all inventory items
    const inventoryResult = await inventoryStorage.getAll(storeId, { limit: 10000 })
    const items = inventoryResult.items

    // Calculate inventory value (using costPrice if available, otherwise unitPrice)
    let totalInventoryValue = 0
    let totalInventoryValueByCost = 0
    let totalInventoryValueByPrice = 0
    
    for (const item of items) {
      const quantity = item.currentQuantity
      const costValue = (item.costPrice || 0) * quantity
      const priceValue = (item.unitPrice || 0) * quantity
      
      totalInventoryValueByCost += costValue
      totalInventoryValueByPrice += priceValue
      totalInventoryValue += costValue || priceValue // Prefer cost price, fallback to unit price
    }

    // Get expenses linked to inventory items to calculate turnover
    const expensesWithInventory = await (db as any).expense.findMany({
      where: {
        inventoryItemId: {
          not: null,
        },
        ticket: {
          storeId: storeId,
        },
      },
      include: {
        ticket: {
          select: {
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate turnover metrics
    const turnoverByItem = new Map<string, { quantity: number; value: number; count: number }>()
    let totalTurnoverQuantity = 0
    let totalTurnoverValue = 0
    let turnoverCount = 0

    for (const expense of expensesWithInventory) {
      if (expense.inventoryItemId) {
        const itemId = expense.inventoryItemId
        const quantity = expense.quantity.toNumber()
        const value = expense.quantity.toNumber() * expense.price.toNumber()
        
        const existing = turnoverByItem.get(itemId)
        if (existing) {
          existing.quantity += quantity
          existing.value += value
          existing.count += 1
        } else {
          turnoverByItem.set(itemId, { quantity, value, count: 1 })
        }

        totalTurnoverQuantity += quantity
        totalTurnoverValue += value
        turnoverCount += 1
      }
    }

    // Get date range from query params (optional)
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let turnoverByDate: { date: string; quantity: number; value: number }[] = []
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const dateFilteredExpenses = expensesWithInventory.filter(
        (expense: any) =>
          expense.createdAt >= start && expense.createdAt <= end
      )

      const dateMap = new Map<string, { quantity: number; value: number }>()
      for (const expense of dateFilteredExpenses) {
        if (expense.inventoryItemId) {
          const dateKey = expense.createdAt.toISOString().split('T')[0]
          const quantity = expense.quantity.toNumber()
          const value = expense.quantity.toNumber() * expense.price.toNumber()

          const existing = dateMap.get(dateKey)
          if (existing) {
            existing.quantity += quantity
            existing.value += value
          } else {
            dateMap.set(dateKey, { quantity, value })
          }
        }
      }

      turnoverByDate = Array.from(dateMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Calculate low stock items
    const lowStockItems = items.filter(
      (item) => item.currentQuantity <= item.minQuantity
    )

    // Calculate zero stock items
    const zeroStockItems = items.filter((item) => item.currentQuantity === 0)

    // Calculate top moving items (by quantity)
    const topMovingItems = Array.from(turnoverByItem.entries())
      .map(([itemId, data]) => {
        const item = items.find((i) => i.id === itemId)
        return {
          itemId,
          itemName: item?.name || 'Unknown',
          quantity: data.quantity,
          value: data.value,
          count: data.count,
        }
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Calculate category breakdown
    const categoryBreakdown = new Map<
      string,
      { count: number; totalValue: number; totalQuantity: number }
    >()

    for (const item of items) {
      const category = item.category || 'Uncategorized'
      const value = (item.costPrice || item.unitPrice || 0) * item.currentQuantity

      const existing = categoryBreakdown.get(category)
      if (existing) {
        existing.count += 1
        existing.totalValue += value
        existing.totalQuantity += item.currentQuantity
      } else {
        categoryBreakdown.set(category, {
          count: 1,
          totalValue: value,
          totalQuantity: item.currentQuantity,
        })
      }
    }

    const categoryBreakdownArray = Array.from(categoryBreakdown.entries())
      .map(([category, data]) => ({
        category,
        ...data,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)

    // Format period label if dates provided
    let period = undefined
    if (startDate && endDate) {
      const periodLabel = startDate === endDate 
        ? formatDate(startDate)
        : `${formatDate(startDate)} to ${formatDate(endDate)}`
      
      period = {
        startDate,
        endDate,
        label: periodLabel,
      }
    }

    const duration = Date.now() - startTime
    logger.info('Inventory report generated', { storeId, duration }, requestId)

    // Prepare report data
    const reportData = {
      period,
      summary: {
        totalItems: items.length,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalInventoryValueByCost: Math.round(totalInventoryValueByCost * 100) / 100,
        totalInventoryValueByPrice: Math.round(totalInventoryValueByPrice * 100) / 100,
        lowStockItemsCount: lowStockItems.length,
        zeroStockItemsCount: zeroStockItems.length,
        totalTurnoverQuantity: Math.round(totalTurnoverQuantity * 100) / 100,
        totalTurnoverValue: Math.round(totalTurnoverValue * 100) / 100,
        turnoverCount,
      },
      turnoverByDate,
      topMovingItems,
      categoryBreakdown: categoryBreakdownArray,
      lowStockItems: lowStockItems.slice(0, 20).map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        currentQuantity: item.currentQuantity,
        minQuantity: item.minQuantity,
      })),
      zeroStockItems: zeroStockItems.slice(0, 20).map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        currentQuantity: item.currentQuantity,
      })),
    }

    // Get language from settings
    const settings = await settingsStorage.findByStoreId(storeId)
    const language = (settings?.language && isValidLanguage(settings.language)) ? settings.language : 'en'
    const translations = getPdfTranslations(language)

    // Ensure fonts are registered before rendering
    await ensurePdfFontsRegistered()

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InventoryReportPDF, { store, reportData, translations, language }) as React.ReactElement
    )

    // Convert Buffer to Uint8Array for NextResponse
    const pdfArray = new Uint8Array(pdfBuffer)

    // Generate filename
    const dateSuffix = startDate && endDate 
      ? `${startDate}-to-${endDate}` 
      : 'all-time'
    const filename = `inventory-report-${dateSuffix}.pdf`

    // Return PDF as response
    return new NextResponse(pdfArray, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error generating inventory report', error, requestId)
    logger.error('Error generating inventory report details', { duration }, requestId)
    return NextResponse.json(
      { error: 'Failed to generate inventory report' },
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


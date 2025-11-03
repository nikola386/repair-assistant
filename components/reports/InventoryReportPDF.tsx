import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDF_FONT_FAMILY } from '@/lib/pdfFonts'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    // Use Roboto for Cyrillic support, falls back to Times-Roman if registration fails
    fontFamily: PDF_FONT_FAMILY,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #000000',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 5,
  },
  companyInfo: {
    marginTop: 10,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  infoText: {
    fontSize: 9,
    marginBottom: 2,
    color: '#333333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '2 solid #000000',
    paddingBottom: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  statBox: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F5F5F5',
    border: '1 solid #CCCCCC',
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    color: '#FFFFFF',
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #CCCCCC',
    fontSize: 9,
  },
  tableCell: {
    paddingRight: 5,
  },
  tableCellNumber: {
    textAlign: 'right',
    paddingLeft: 5,
  },
  colItemName: {
    width: '35%',
  },
  colQuantity: {
    width: '15%',
  },
  colValue: {
    width: '20%',
  },
  colCount: {
    width: '15%',
  },
  colCategory: {
    width: '25%',
  },
  colSKU: {
    width: '20%',
  },
  colCurrentQty: {
    width: '20%',
  },
  colMinQty: {
    width: '20%',
  },
  totalsRow: {
    flexDirection: 'row',
    padding: 10,
    marginTop: 10,
    backgroundColor: '#000000',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalsLabel: {
    width: '50%',
  },
  totalsValue: {
    width: '50%',
    textAlign: 'right',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1 solid #CCCCCC',
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
  },
})

interface InventoryReportData {
  period?: {
    startDate: string
    endDate: string
    label: string
  }
  summary: {
    totalItems: number
    totalInventoryValue: number
    totalInventoryValueByCost: number
    totalInventoryValueByPrice: number
    lowStockItemsCount: number
    zeroStockItemsCount: number
    totalTurnoverQuantity: number
    totalTurnoverValue: number
    turnoverCount: number
  }
  topMovingItems: Array<{
    itemId: string
    itemName: string
    quantity: number
    value: number
    count: number
  }>
  categoryBreakdown: Array<{
    category: string
    count: number
    totalValue: number
    totalQuantity: number
  }>
  lowStockItems: Array<{
    id: string
    name: string
    sku?: string
    currentQuantity: number
    minQuantity: number
  }>
  zeroStockItems: Array<{
    id: string
    name: string
    sku?: string
    currentQuantity: number
  }>
  turnoverByDate?: Array<{
    date: string
    quantity: number
    value: number
  }>
}

interface InventoryReportPDFProps {
  store: {
    name: string
    address?: string | null
    street?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
    country?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    vatNumber?: string | null
    currency?: string | null
  }
  reportData: InventoryReportData
}

const InventoryReportPDF: React.FC<InventoryReportPDFProps> = ({ store, reportData }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    const currency = store.currency || 'USD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Build company address
  const companyAddressParts = [
    store.street,
    store.city,
    store.state,
    store.postalCode,
    store.country,
  ].filter(Boolean)
  const companyAddress = companyAddressParts.join(', ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVENTORY REPORT</Text>
          {reportData.period && (
            <>
              <Text style={styles.subtitle}>{reportData.period.label}</Text>
              <Text style={styles.subtitle}>
                {formatDate(reportData.period.startDate)} - {formatDate(reportData.period.endDate)}
              </Text>
            </>
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{store.name || 'Repair Shop'}</Text>
            {companyAddress && <Text style={styles.infoText}>{companyAddress}</Text>}
            {store.phone && <Text style={styles.infoText}>Phone: {store.phone}</Text>}
            {store.email && <Text style={styles.infoText}>Email: {store.email}</Text>}
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Items</Text>
              <Text style={styles.statValue}>{reportData.summary.totalItems}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Inventory Value</Text>
              <Text style={styles.statValue}>{formatCurrency(reportData.summary.totalInventoryValue)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Inventory Value (Cost)</Text>
              <Text style={styles.statValue}>{formatCurrency(reportData.summary.totalInventoryValueByCost)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Inventory Value (Price)</Text>
              <Text style={styles.statValue}>{formatCurrency(reportData.summary.totalInventoryValueByPrice)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Low Stock Items</Text>
              <Text style={styles.statValue}>{reportData.summary.lowStockItemsCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Zero Stock Items</Text>
              <Text style={styles.statValue}>{reportData.summary.zeroStockItemsCount}</Text>
            </View>
            {reportData.summary.turnoverCount > 0 && (
              <>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total Turnover Quantity</Text>
                  <Text style={styles.statValue}>{reportData.summary.totalTurnoverQuantity.toFixed(2)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total Turnover Value</Text>
                  <Text style={styles.statValue}>{formatCurrency(reportData.summary.totalTurnoverValue)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Turnover Transactions</Text>
                  <Text style={styles.statValue}>{reportData.summary.turnoverCount}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Category Breakdown */}
        {reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.colCategory]}>Category</Text>
                <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>Items</Text>
                <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>Total Qty</Text>
                <Text style={[styles.tableCell, styles.colValue, styles.tableCellNumber]}>Total Value</Text>
              </View>
              {reportData.categoryBreakdown.map((category, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colCategory]}>{category.category || 'Uncategorized'}</Text>
                  <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>{category.count}</Text>
                  <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>{category.totalQuantity.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, styles.colValue, styles.tableCellNumber]}>
                    {formatCurrency(category.totalValue)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>TOTAL</Text>
                <Text style={styles.totalsValue}>
                  {reportData.categoryBreakdown.reduce((sum, c) => sum + c.count, 0)} |{' '}
                  {reportData.categoryBreakdown.reduce((sum, c) => sum + c.totalQuantity, 0).toFixed(2)} |{' '}
                  {formatCurrency(
                    reportData.categoryBreakdown.reduce((sum, c) => sum + c.totalValue, 0)
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Moving Items */}
        {reportData.topMovingItems && reportData.topMovingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Moving Items</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.colItemName]}>Item Name</Text>
                <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>Quantity</Text>
                <Text style={[styles.tableCell, styles.colValue, styles.tableCellNumber]}>Value</Text>
                <Text style={[styles.tableCell, styles.colCount, styles.tableCellNumber]}>Transactions</Text>
              </View>
              {reportData.topMovingItems.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colItemName]}>{item.itemName}</Text>
                  <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>{item.quantity.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, styles.colValue, styles.tableCellNumber]}>
                    {formatCurrency(item.value)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCount, styles.tableCellNumber]}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Low Stock Items */}
        {reportData.lowStockItems && reportData.lowStockItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Low Stock Items</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.colItemName]}>Item Name</Text>
                <Text style={[styles.tableCell, styles.colSKU]}>SKU</Text>
                <Text style={[styles.tableCell, styles.colCurrentQty, styles.tableCellNumber]}>Current Qty</Text>
                <Text style={[styles.tableCell, styles.colMinQty, styles.tableCellNumber]}>Min Qty</Text>
              </View>
              {reportData.lowStockItems.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colItemName]}>{item.name}</Text>
                  <Text style={[styles.tableCell, styles.colSKU]}>{item.sku || '-'}</Text>
                  <Text style={[styles.tableCell, styles.colCurrentQty, styles.tableCellNumber]}>{item.currentQuantity.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, styles.colMinQty, styles.tableCellNumber]}>{item.minQuantity.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Zero Stock Items */}
        {reportData.zeroStockItems && reportData.zeroStockItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zero Stock Items</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.colItemName]}>Item Name</Text>
                <Text style={[styles.tableCell, styles.colSKU]}>SKU</Text>
                <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>Quantity</Text>
              </View>
              {reportData.zeroStockItems.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colItemName]}>{item.name}</Text>
                  <Text style={[styles.tableCell, styles.colSKU]}>{item.sku || '-'}</Text>
                  <Text style={[styles.tableCell, styles.colQuantity, styles.tableCellNumber]}>{item.currentQuantity.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}</Text>
        </View>

        {/* Page Number */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
          `${pageNumber} / ${totalPages}`
        } fixed />
      </Page>
    </Document>
  )
}

export default InventoryReportPDF


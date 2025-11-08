import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { RepairTicket } from '@/types/ticket'
import { PDF_FONT_FAMILY } from '@/lib/pdfFonts'
import { PdfTranslations } from '@/lib/pdfTranslations'
import { Language } from '@/lib/languages'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: PDF_FONT_FAMILY,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #000000',
    paddingBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 3,
  },
  companyInfo: {
    width: '45%',
  },
  logoContainer: {
    marginBottom: 10,
  },
  logo: {
    maxWidth: 120,
    maxHeight: 60,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 9,
    marginBottom: 2,
    color: '#333333',
  },
  section: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  sectionColumn: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1 solid #CCCCCC',
    paddingBottom: 5,
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  gridLabel: {
    width: '30%',
    fontWeight: 'bold',
    fontSize: 9,
  },
  gridValue: {
    width: '70%',
    fontSize: 9,
    color: '#333333',
  },
  fullWidth: {
    width: '100%',
  },
  descriptionBox: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 4,
    marginTop: 5,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#333333',
  },
  expensesTable: {
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
  tableCellName: {
    width: '40%',
  },
  tableCellQuantity: {
    width: '15%',
    textAlign: 'right',
  },
  tableCellPrice: {
    width: '22.5%',
    textAlign: 'right',
  },
  tableCellTotal: {
    width: '22.5%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 10,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    fontSize: 14,
    paddingTop: 10,
    borderTop: '2 solid #000000',
    marginTop: 10,
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1 solid #CCCCCC',
    fontSize: 8,
    color: '#666666',
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
  },
  footerText: {
    marginBottom: 3,
    lineHeight: 1.4,
  },
})

interface InvoicePDFProps {
  ticket: RepairTicket
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
    logo?: string | null
    taxEnabled?: boolean | null
    taxRate?: number | null
    taxInclusive?: boolean | null
  }
  translations: PdfTranslations
  language: Language
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ ticket, store, translations, language }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const locale = language === 'bg' ? 'bg-BG' : language === 'de' ? 'de-DE' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount) || !isFinite(amount)) return 'N/A'
    const currency = store.currency || 'USD'
    const locale = language === 'bg' ? 'bg-BG' : language === 'de' ? 'de-DE' : 'en-US'
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch (error) {
      return amount.toFixed(2)
    }
  }

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: translations.pending,
      in_progress: translations.inProgress,
      waiting_parts: translations.waitingParts,
      completed: translations.completed,
      cancelled: translations.cancelled,
    }
    return statusMap[status] || status
  }

  const formatPriority = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: translations.low,
      medium: translations.medium,
      high: translations.high,
      urgent: translations.urgent,
    }
    return priorityMap[priority] || priority
  }

  const expensesTotal = ticket.expenses?.reduce(
    (sum, expense) => {
      const qty = typeof expense.quantity === 'number' ? expense.quantity : Number(expense.quantity) || 0
      const price = typeof expense.price === 'number' ? expense.price : Number(expense.price) || 0
      return sum + (qty * price)
    },
    0
  ) || 0

  const actualCostNum = typeof ticket.actualCost === 'number' ? ticket.actualCost : (ticket.actualCost ? Number(ticket.actualCost) : 0)
  const estimatedCostNum = typeof ticket.estimatedCost === 'number' ? ticket.estimatedCost : (ticket.estimatedCost ? Number(ticket.estimatedCost) : 0)
  const totalCost = actualCostNum || estimatedCostNum || 0

  const subtotal = (expensesTotal || 0) + (totalCost || 0)

  let taxAmount = 0
  let subtotalBeforeTax = subtotal
  let grandTotal = subtotal

  if (store.taxEnabled && store.taxRate !== null && store.taxRate !== undefined) {
    const taxRate = typeof store.taxRate === 'number' ? store.taxRate : Number(store.taxRate) || 0
    
    if (!isNaN(taxRate) && isFinite(taxRate) && taxRate >= 0 && taxRate <= 100) {
      if (store.taxInclusive) {
        taxAmount = subtotal * (taxRate / (100 + taxRate))
        subtotalBeforeTax = subtotal - taxAmount
        grandTotal = subtotal
      } else {
        taxAmount = subtotal * (taxRate / 100)
        subtotalBeforeTax = subtotal
        grandTotal = subtotal + taxAmount
      }
      
      if (isNaN(taxAmount) || !isFinite(taxAmount)) taxAmount = 0
      if (isNaN(subtotalBeforeTax) || !isFinite(subtotalBeforeTax)) subtotalBeforeTax = subtotal
      if (isNaN(grandTotal) || !isFinite(grandTotal)) grandTotal = subtotal
    }
  }

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
          <View style={styles.headerRow}>
            <View style={styles.companyInfo}>
              {store.logo && (
                <View style={styles.logoContainer}>
                  <Image src={store.logo} style={styles.logo} />
                </View>
              )}
              <Text style={styles.companyName}>{store.name || translations.repairShop}</Text>
              {companyAddress && <Text style={styles.infoText}>{companyAddress}</Text>}
              {store.phone && <Text style={styles.infoText}>{translations.phone}: {store.phone}</Text>}
              {store.email && <Text style={styles.infoText}>{translations.email}: {store.email}</Text>}
              {store.website && <Text style={styles.infoText}>{translations.website}: {store.website}</Text>}
              {store.vatNumber && <Text style={styles.infoText}>{translations.vat}: {store.vatNumber}</Text>}
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.title}>{translations.repairInvoice}</Text>
              <Text style={styles.subtitle}>{translations.ticketNumber}: {ticket.ticketNumber}</Text>
              <Text style={styles.subtitle}>{translations.date}: {formatDate(ticket.createdAt)}</Text>
              <Text style={styles.subtitle}>{translations.status}: {formatStatus(ticket.status)}</Text>
            </View>
          </View>
        </View>

        {/* Customer Information and Device Information */}
        <View style={styles.sectionRow}>
          {/* Customer Information */}
          <View style={styles.sectionColumn}>
            <Text style={styles.sectionTitle}>{translations.customerInformation}</Text>
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>{translations.name}:</Text>
              <Text style={styles.gridValue}>{ticket.customerName}</Text>
            </View>
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>{translations.email}:</Text>
              <Text style={styles.gridValue}>{ticket.customerEmail}</Text>
            </View>
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>{translations.phone}:</Text>
              <Text style={styles.gridValue}>{ticket.customerPhone}</Text>
            </View>
          </View>

          {/* Device Information */}
          <View style={styles.sectionColumn}>
            <Text style={styles.sectionTitle}>{translations.deviceInformation}</Text>
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>{translations.deviceType}:</Text>
              <Text style={styles.gridValue}>{ticket.deviceType}</Text>
            </View>
            {ticket.deviceBrand && (
              <View style={styles.grid}>
                <Text style={styles.gridLabel}>{translations.brand}:</Text>
                <Text style={styles.gridValue}>{ticket.deviceBrand}</Text>
              </View>
            )}
            {ticket.deviceModel && (
              <View style={styles.grid}>
                <Text style={styles.gridLabel}>{translations.model}:</Text>
                <Text style={styles.gridValue}>{ticket.deviceModel}</Text>
              </View>
            )}
            {ticket.deviceSerialNumber && (
              <View style={styles.grid}>
                <Text style={styles.gridLabel}>{translations.serialNumber}:</Text>
                <Text style={styles.gridValue}>{ticket.deviceSerialNumber}</Text>
              </View>
            )}
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>{translations.priority}:</Text>
              <Text style={styles.gridValue}>{formatPriority(ticket.priority)}</Text>
            </View>
          </View>
        </View>

        {/* Issue Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translations.issueDescription}</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{ticket.issueDescription}</Text>
          </View>
        </View>

        {/* Expenses/Parts */}
        {ticket.expenses && ticket.expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{translations.partsComponents}</Text>
            <View style={styles.expensesTable}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellName}>{translations.partComponent}</Text>
                <Text style={styles.tableCellQuantity}>{translations.quantity}</Text>
                <Text style={styles.tableCellPrice}>{translations.unitPrice}</Text>
                <Text style={styles.tableCellTotal}>{translations.total}</Text>
              </View>
              {ticket.expenses.map((expense) => {
                const qty = typeof expense.quantity === 'number' ? expense.quantity : Number(expense.quantity) || 0
                const price = typeof expense.price === 'number' ? expense.price : Number(expense.price) || 0
                const lineTotal = qty * price
                return (
                  <View key={expense.id} style={styles.tableRow}>
                    <Text style={styles.tableCellName}>{expense.name}</Text>
                    <Text style={styles.tableCellQuantity}>{qty}</Text>
                    <Text style={styles.tableCellPrice}>{formatCurrency(price)}</Text>
                    <Text style={styles.tableCellTotal}>{formatCurrency(lineTotal)}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Cost Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translations.costSummary}</Text>
          <View style={styles.totalsSection}>
            {ticket.expenses && ticket.expenses.length > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{translations.partsTotal}:</Text>
                <Text style={styles.totalValue}>{formatCurrency(expensesTotal)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {ticket.actualCost ? `${translations.totalCost}:` : `${translations.estimatedCost}:`}
              </Text>
              <Text style={styles.totalValue}>{formatCurrency(totalCost)}</Text>
            </View>
            {store.taxEnabled && store.taxRate !== null && store.taxRate !== undefined && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{translations.subtotal || 'Subtotal'}:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(subtotalBeforeTax)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    {translations.tax || 'Tax'} ({typeof store.taxRate === 'number' ? store.taxRate.toFixed(2) : Number(store.taxRate).toFixed(2)}%):
                  </Text>
                  <Text style={styles.totalValue}>{formatCurrency(taxAmount)}</Text>
                </View>
              </>
            )}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.totalLabel}>{translations.amountDue}:</Text>
              <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translations.importantDates}</Text>
          <View style={styles.grid}>
            <Text style={styles.gridLabel}>{translations.dateReceived}:</Text>
            <Text style={styles.gridValue}>{formatDate(ticket.createdAt)}</Text>
          </View>
          {ticket.estimatedCompletionDate && (
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>{translations.estimatedCompletion}:</Text>
              <Text style={styles.gridValue}>{formatDate(ticket.estimatedCompletionDate)}</Text>
            </View>
          )}
          {ticket.actualCompletionDate && (
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>{translations.completedOn}:</Text>
              <Text style={styles.gridValue}>{formatDate(ticket.actualCompletionDate)}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {ticket.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{translations.notes}</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{ticket.notes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>{translations.termsConditions}</Text>
          <Text style={styles.footerText}>
            {translations.terms1}
          </Text>
          <Text style={styles.footerText}>
            {translations.terms2}
          </Text>
          <Text style={styles.footerText}>
            {translations.terms3}
          </Text>
          <Text style={styles.footerText}>
            {translations.terms4}
          </Text>
          <Text style={[styles.footerText, { marginTop: 10 }]}>
            {translations.thankYou}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default InvoicePDF


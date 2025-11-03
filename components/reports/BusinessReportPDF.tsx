import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { PDF_FONT_FAMILY } from '@/lib/pdfFonts'
import { PdfTranslations } from '@/lib/pdfTranslations'
import { Language } from '@/lib/languages'

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
  logoContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  logo: {
    maxWidth: 120,
    maxHeight: 60,
    objectFit: 'contain',
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
  colDeviceType: {
    width: '30%',
  },
  colCount: {
    width: '20%',
  },
  colRevenue: {
    width: '25%',
  },
  colExpenses: {
    width: '25%',
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

interface BusinessReportData {
  period: {
    startDate: string
    endDate: string
    label: string
  }
  summary: {
    totalRepairs: number
    completedRepairs: number
    inProgressRepairs: number
    waitingRepairs: number
    cancelledRepairs: number
    income: number
    expenses: number
    grossProfit: number
    grossProfitPercentage: number
    averageRepairTime: number
    completionRate: number
  }
  byDeviceType: Array<{
    deviceType: string
    count: number
    revenue: number
    expenses: number
    profit: number
  }>
  topCustomers: Array<{
    name: string
    email: string
    ticketCount: number
    totalSpent: number
  }>
  expensesByCategory?: Array<{
    category: string
    total: number
  }>
}

interface BusinessReportPDFProps {
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
  }
  reportData: BusinessReportData
  translations: PdfTranslations
  language: Language
}

const BusinessReportPDF: React.FC<BusinessReportPDFProps> = ({ store, reportData, translations, language }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = language === 'bg' ? 'bg-BG' : language === 'de' ? 'de-DE' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    const currency = store.currency || 'USD'
    const locale = language === 'bg' ? 'bg-BG' : language === 'de' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatDays = (days: number) => {
    if (days === 0) return `0 ${translations.days}`
    if (days < 1) return `${Math.round(days * 24)} ${translations.hours}`
    if (days === 1) return `1 ${translations.day}`
    return `${days.toFixed(1)} ${translations.days}`
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
          <Text style={styles.title}>{translations.businessReport}</Text>
          <Text style={styles.subtitle}>
            {formatDate(reportData.period.startDate)} - {formatDate(reportData.period.endDate)}
          </Text>
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
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translations.summaryStatistics}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.totalRepairs}</Text>
              <Text style={styles.statValue}>{reportData.summary.totalRepairs}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.completedRepairs}</Text>
              <Text style={styles.statValue}>{reportData.summary.completedRepairs}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.inProgress}</Text>
              <Text style={styles.statValue}>{reportData.summary.inProgressRepairs}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.waiting}</Text>
              <Text style={styles.statValue}>{reportData.summary.waitingRepairs}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.totalRevenue}</Text>
              <Text style={styles.statValue}>{formatCurrency(reportData.summary.income)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.totalExpenses}</Text>
              <Text style={styles.statValue}>{formatCurrency(reportData.summary.expenses)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.grossProfit}</Text>
              <Text style={styles.statValue}>{formatCurrency(reportData.summary.grossProfit)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.profitMargin}</Text>
              <Text style={styles.statValue}>{formatPercentage(reportData.summary.grossProfitPercentage)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.avgRepairTime}</Text>
              <Text style={styles.statValue}>{formatDays(reportData.summary.averageRepairTime)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{translations.completionRate}</Text>
              <Text style={styles.statValue}>{formatPercentage(reportData.summary.completionRate)}</Text>
            </View>
          </View>
        </View>

        {/* Performance by Device Type */}
        {reportData.byDeviceType && reportData.byDeviceType.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{translations.performanceByDeviceType}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.colDeviceType]}>{translations.deviceType}</Text>
                <Text style={[styles.tableCell, styles.colCount, styles.tableCellNumber]}>{translations.count}</Text>
                <Text style={[styles.tableCell, styles.colRevenue, styles.tableCellNumber]}>{translations.revenue}</Text>
                <Text style={[styles.tableCell, styles.colExpenses, styles.tableCellNumber]}>{translations.expenses}</Text>
              </View>
              {reportData.byDeviceType.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colDeviceType]}>{item.deviceType}</Text>
                  <Text style={[styles.tableCell, styles.colCount, styles.tableCellNumber]}>{item.count}</Text>
                  <Text style={[styles.tableCell, styles.colRevenue, styles.tableCellNumber]}>
                    {formatCurrency(item.revenue)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colExpenses, styles.tableCellNumber]}>
                    {formatCurrency(item.expenses)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{translations.total}</Text>
                <Text style={styles.totalsValue}>
                  {reportData.byDeviceType.reduce((sum, item) => sum + item.count, 0)} |{' '}
                  {formatCurrency(
                    reportData.byDeviceType.reduce((sum, item) => sum + item.revenue, 0)
                  )}{' '}
                  | {formatCurrency(reportData.byDeviceType.reduce((sum, item) => sum + item.expenses, 0))}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Customers */}
        {reportData.topCustomers && reportData.topCustomers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{translations.topCustomers}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '50%' }]}>{translations.customer}</Text>
                <Text style={[styles.tableCell, { width: '25%' }, styles.tableCellNumber]}>{translations.tickets}</Text>
                <Text style={[styles.tableCell, { width: '25%' }, styles.tableCellNumber]}>{translations.totalSpent}</Text>
              </View>
              {reportData.topCustomers.map((customer, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '50%' }]}>
                    {customer.name}
                    {'\n'}
                    <Text style={{ fontSize: 8, color: '#666666' }}>{customer.email}</Text>
                  </Text>
                  <Text style={[styles.tableCell, { width: '25%' }, styles.tableCellNumber]}>
                    {customer.ticketCount}
                  </Text>
                  <Text style={[styles.tableCell, { width: '25%' }, styles.tableCellNumber]}>
                    {formatCurrency(customer.totalSpent)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{translations.generatedOn} {new Date().toLocaleDateString(language === 'bg' ? 'bg-BG' : language === 'de' ? 'de-DE' : 'en-US', {
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

export default BusinessReportPDF


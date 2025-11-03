import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { RepairTicket } from '@/types/ticket'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
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
  partsTable: {
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
  tableCellPart: {
    width: '50%',
  },
  tableCellQuantity: {
    width: '15%',
    textAlign: 'right',
  },
  tableCellPrice: {
    width: '17.5%',
    textAlign: 'right',
  },
  tableCellTotal: {
    width: '17.5%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  technicalSection: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
    border: '1 solid #DDDDDD',
  },
  technicalTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  technicalItem: {
    marginBottom: 6,
    fontSize: 9,
    lineHeight: 1.4,
  },
  technicalLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  warrantyBox: {
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 4,
    border: '1 solid #FFD700',
    marginTop: 10,
  },
  warrantyTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
  },
  warrantyText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#333333',
  },
  recommendationsBox: {
    backgroundColor: '#E8F4F8',
    padding: 10,
    borderRadius: 4,
    border: '1 solid #2196F3',
    marginTop: 10,
  },
  recommendationsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
  },
  recommendationsText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#333333',
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
  statusBadge: {
    padding: '4 8',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#000000',
    color: '#FFFFFF',
  },
})

interface ServiceReportPDFProps {
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
  }
}

const ServiceReportPDF: React.FC<ServiceReportPDFProps> = ({ ticket, store }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A'
    const currency = store.currency || 'USD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      waiting_parts: 'Waiting for Parts',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    return statusMap[status] || status
  }

  const formatPriority = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    }
    return priorityMap[priority] || priority
  }

  // Calculate expenses total
  const expensesTotal = ticket.expenses?.reduce(
    (sum, expense) => sum + expense.quantity * expense.price,
    0
  ) || 0

  // Calculate repair time
  const repairTime = ticket.actualCompletionDate && ticket.createdAt
    ? (new Date(ticket.actualCompletionDate).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : null

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
          <View style={styles.headerRow}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{store.name || 'Repair Shop'}</Text>
              {companyAddress && <Text style={styles.infoText}>{companyAddress}</Text>}
              {store.phone && <Text style={styles.infoText}>Phone: {store.phone}</Text>}
              {store.email && <Text style={styles.infoText}>Email: {store.email}</Text>}
              {store.website && <Text style={styles.infoText}>Website: {store.website}</Text>}
              {store.vatNumber && <Text style={styles.infoText}>VAT: {store.vatNumber}</Text>}
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.title}>SERVICE REPORT</Text>
              <Text style={styles.subtitle}>Ticket #: {ticket.ticketNumber}</Text>
              <Text style={styles.subtitle}>Date: {formatDate(ticket.createdAt)}</Text>
              <Text style={styles.subtitle}>
                Status: <Text style={styles.statusBadge}>{formatStatus(ticket.status)}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.grid}>
            <Text style={styles.gridLabel}>Name:</Text>
            <Text style={styles.gridValue}>{ticket.customerName}</Text>
          </View>
          <View style={styles.grid}>
            <Text style={styles.gridLabel}>Email:</Text>
            <Text style={styles.gridValue}>{ticket.customerEmail}</Text>
          </View>
          <View style={styles.grid}>
            <Text style={styles.gridLabel}>Phone:</Text>
            <Text style={styles.gridValue}>{ticket.customerPhone}</Text>
          </View>
        </View>

        {/* Device Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.grid}>
            <Text style={styles.gridLabel}>Device Type:</Text>
            <Text style={styles.gridValue}>{ticket.deviceType}</Text>
          </View>
          {ticket.deviceBrand && (
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>Brand:</Text>
              <Text style={styles.gridValue}>{ticket.deviceBrand}</Text>
            </View>
          )}
          {ticket.deviceModel && (
            <View style={styles.grid}>
              <Text style={styles.gridLabel}>Model:</Text>
              <Text style={styles.gridValue}>{ticket.deviceModel}</Text>
            </View>
          )}
          <View style={styles.grid}>
            <Text style={styles.gridLabel}>Priority:</Text>
            <Text style={styles.gridValue}>{formatPriority(ticket.priority)}</Text>
          </View>
        </View>

        {/* Issue Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Description</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{ticket.issueDescription}</Text>
          </View>
        </View>

        {/* Technical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Details</Text>
          <View style={styles.technicalSection}>
            <Text style={styles.technicalTitle}>Repair Timeline</Text>
            <View style={styles.technicalItem}>
              <Text style={styles.technicalLabel}>Date Received:</Text>
              <Text>{formatDateTime(ticket.createdAt)}</Text>
            </View>
            {ticket.estimatedCompletionDate && (
              <View style={styles.technicalItem}>
                <Text style={styles.technicalLabel}>Estimated Completion:</Text>
                <Text>{formatDate(ticket.estimatedCompletionDate)}</Text>
              </View>
            )}
            {ticket.actualCompletionDate && (
              <View style={styles.technicalItem}>
                <Text style={styles.technicalLabel}>Completed On:</Text>
                <Text>{formatDateTime(ticket.actualCompletionDate)}</Text>
              </View>
            )}
            {repairTime !== null && (
              <View style={styles.technicalItem}>
                <Text style={styles.technicalLabel}>Repair Duration:</Text>
                <Text>
                  {repairTime < 1
                    ? `${Math.round(repairTime * 24)} hours`
                    : `${repairTime.toFixed(1)} days`}
                </Text>
              </View>
            )}
            <View style={styles.technicalItem}>
              <Text style={styles.technicalLabel}>Total Cost:</Text>
              <Text>{formatCurrency(ticket.actualCost ?? ticket.estimatedCost ?? 0)}</Text>
            </View>
          </View>
        </View>

        {/* Parts & Components Replaced */}
        {ticket.expenses && ticket.expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parts & Components Replaced</Text>
            <View style={styles.partsTable}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellPart}>Part/Component</Text>
                <Text style={styles.tableCellQuantity}>Qty</Text>
                <Text style={styles.tableCellPrice}>Unit Price</Text>
                <Text style={styles.tableCellTotal}>Total</Text>
              </View>
              {ticket.expenses.map((expense) => {
                const lineTotal = expense.quantity * expense.price
                return (
                  <View key={expense.id} style={styles.tableRow}>
                    <Text style={styles.tableCellPart}>{expense.name}</Text>
                    <Text style={styles.tableCellQuantity}>{expense.quantity}</Text>
                    <Text style={styles.tableCellPrice}>{formatCurrency(expense.price)}</Text>
                    <Text style={styles.tableCellTotal}>{formatCurrency(lineTotal)}</Text>
                  </View>
                )
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <View style={{ width: '50%', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                  Parts Total: {formatCurrency(expensesTotal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Service Notes */}
        {ticket.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Notes</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{ticket.notes}</Text>
            </View>
          </View>
        )}

        {/* Warranty Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Warranty & Service Guarantee</Text>
          <View style={styles.warrantyBox}>
            <Text style={styles.warrantyTitle}>Service Warranty</Text>
            <Text style={styles.warrantyText}>
              • All repairs are guaranteed for 90 days from the completion date, unless otherwise specified.{'\n'}
              • Warranty covers the same issue that was originally repaired.{'\n'}
              • Warranty does not cover physical damage, water damage, or issues unrelated to the original repair.{'\n'}
              • If warranty service is needed, please contact us immediately.
            </Text>
            {ticket.actualCompletionDate && (
              <Text style={[styles.warrantyText, { marginTop: 8, fontWeight: 'bold' }]}>
                Warranty Valid Until: {(() => {
                  const completionDate = new Date(ticket.actualCompletionDate)
                  completionDate.setDate(completionDate.getDate() + 90)
                  return formatDate(completionDate.toISOString())
                })()}
              </Text>
            )}
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.recommendationsBox}>
            <Text style={styles.recommendationsTitle}>Maintenance Recommendations</Text>
            <Text style={styles.recommendationsText}>
              • Keep your device clean and free from dust and debris.{'\n'}
              • Avoid exposure to extreme temperatures or moisture.{'\n'}
              • Use recommended accessories and chargers only.{'\n'}
              • Regular maintenance checks are recommended every 6-12 months.{'\n'}
              • Contact us if you notice any unusual behavior or performance issues.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Certification</Text>
          <Text style={styles.footerText}>
            This service report certifies that the above-listed device has been inspected and serviced according to
            industry standards. All repairs have been completed and tested to ensure proper functionality.
          </Text>
          <Text style={[styles.footerText, { marginTop: 10 }]}>
            Report Generated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={[styles.footerText, { marginTop: 10, fontStyle: 'italic' }]}>
            Thank you for choosing {store.name || 'our services'}!
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default ServiceReportPDF


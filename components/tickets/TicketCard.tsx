'use client'

import { RepairTicket } from '../../types/ticket'
import { useLanguage } from '../../contexts/LanguageContext'
import Link from 'next/link'
import { useCurrency } from '../../lib/useCurrency'

interface TicketCardProps {
  ticket: RepairTicket
  viewMode?: 'grid'
}

export default function TicketCard({ ticket, viewMode = 'grid' }: TicketCardProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useCurrency()

  const getStatusClass = (status: string) => {
    return `ticket-status ticket-status--${status}`
  }

  const getPriorityClass = (priority: string) => {
    return `ticket-priority ticket-priority--${priority}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Link href={`/tickets/${ticket.id}`} className="ticket-card ticket-card--grid">
      <div className="ticket-card__header">
        <div className="ticket-card__number">{ticket.ticketNumber}</div>
        <span className={getStatusClass(ticket.status)}>
          {t.common.status[ticket.status as keyof typeof t.common.status]}
        </span>
      </div>
      <div className="ticket-card__body">
        <h3 className="ticket-card__customer">{ticket.customerName}</h3>
        <p className="ticket-card__device">
          {ticket.deviceType}
          {ticket.deviceBrand && ` - ${ticket.deviceBrand}`}
          {ticket.deviceModel && ` ${ticket.deviceModel}`}
        </p>
        <p className="ticket-card__issue">{ticket.issueDescription.substring(0, 100)}...</p>
      </div>
      <div className="ticket-card__footer">
        <div className="ticket-card__meta">
          <span className="ticket-card__date">
            {t.common.dates.createdAt}: {formatDate(ticket.createdAt)}
          </span>
          {ticket.estimatedCost && (
            <span className="ticket-card__cost">
              {t.tickets.estimatedCost}: {formatCurrency(ticket.estimatedCost)}
            </span>
          )}
        </div>
        <span className={getPriorityClass(ticket.priority)}>
          {t.common.priority[ticket.priority as keyof typeof t.common.priority]}
        </span>
      </div>
    </Link>
  )
}


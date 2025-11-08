'use client'

import { Warranty } from '@/types/warranty'
import { useLanguage } from '@/contexts/LanguageContext'
import WarrantyStatusBadge from './WarrantyStatusBadge'

interface WarrantyCardProps {
  warranty: Warranty
  viewMode?: 'grid'
}

export default function WarrantyCard({ warranty, viewMode = 'grid' }: WarrantyCardProps) {
  const { t } = useLanguage()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getWarrantyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      parts: t.warranties.type.parts,
      labor: t.warranties.type.labor,
      both: t.warranties.type.both,
    }
    return labels[type] || type
  }

  return (
    <div className="warranty-card warranty-card--grid">
      <div className="warranty-card__header">
        <div className="warranty-card__ticket">
          {warranty.ticket?.ticketNumber || 'N/A'}
        </div>
        <WarrantyStatusBadge status={warranty.status} expiryDate={warranty.expiryDate} />
      </div>
      <div className="warranty-card__body">
        <h3 className="warranty-card__customer">
          {warranty.customer?.name || warranty.ticket?.customerName || t.warranties.card.unknownCustomer}
        </h3>
        <p className="warranty-card__device">
          {warranty.ticket?.deviceType || 'N/A'}
          {warranty.ticket?.deviceBrand && ` - ${warranty.ticket.deviceBrand}`}
          {warranty.ticket?.deviceModel && ` ${warranty.ticket.deviceModel}`}
        </p>
        <p className="warranty-card__type">
          {t.warranties.card.type} {getWarrantyTypeLabel(warranty.warrantyType)}
        </p>
        <p className="warranty-card__period">
          {t.warranties.card.period} {warranty.warrantyPeriodDays} days
        </p>
      </div>
      <div className="warranty-card__footer">
        <div className="warranty-card__meta">
          <span className="warranty-card__date">
            {t.warranties.card.expires} {formatDate(warranty.expiryDate)}
          </span>
          {warranty.warrantyClaims && warranty.warrantyClaims.length > 0 && (
            <span className="warranty-card__claims">
              {warranty.warrantyClaims.length} {warranty.warrantyClaims.length !== 1 ? t.warranties.card.claims : t.warranties.card.claim}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}


'use client'

import { WarrantyStatus } from '@/types/warranty'
import { useLanguage } from '@/contexts/LanguageContext'

interface WarrantyStatusBadgeProps {
  status: WarrantyStatus
  expiryDate?: string
}

export default function WarrantyStatusBadge({ status, expiryDate }: WarrantyStatusBadgeProps) {
  const { t } = useLanguage()
  
  const getStatusClass = (status: WarrantyStatus) => {
    return `warranty-status warranty-status--${status}`
  }

  const getStatusLabel = (status: WarrantyStatus) => {
    const labels: Record<WarrantyStatus, string> = {
      active: t.warranties.status.active,
      expired: t.warranties.status.expired,
      voided: t.warranties.status.voided,
      claimed: t.warranties.status.claimed,
    }
    return labels[status]
  }

  // Check if warranty is expiring soon (within 7 days)
  const isExpiringSoon = () => {
    if (!expiryDate || status !== 'active') return false
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0
  }

  const badgeClass = isExpiringSoon() 
    ? `${getStatusClass(status)} warranty-status--expiring-soon`
    : getStatusClass(status)

  return (
    <span className={badgeClass}>
      {getStatusLabel(status)}
      {isExpiringSoon() && ` (${t.warranties.status.expiringSoon})`}
    </span>
  )
}


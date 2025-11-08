'use client'

import { useState, useEffect } from 'react'
import { Warranty } from '@/types/warranty'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'
import WarrantyStatusBadge from './WarrantyStatusBadge'
import Spinner from '../ui/Spinner'

interface ExpiringWarrantiesWidgetProps {
  daysAhead?: number
}

export default function ExpiringWarrantiesWidget({ daysAhead = 30 }: ExpiringWarrantiesWidgetProps) {
  const { t } = useLanguage()
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExpiringWarranties()
  }, [daysAhead])

  const fetchExpiringWarranties = async () => {
    try {
      const response = await fetch(`/api/warranties/expiring?days=${daysAhead}`)
      if (response.ok) {
        const data = await response.json()
        setWarranties(data.warranties || [])
      }
    } catch (error) {
      console.error('Error fetching expiring warranties:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="widget widget--warranties">
        <div className="widget__header">
          <h2>{t.warranties.widget.expiringWarranties}</h2>
        </div>
        <div className="widget__content">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className="widget widget--warranties">
      <div className="widget__header">
        <h2>{t.warranties.widget.expiringWarranties} ({warranties.length})</h2>
        <Link href="/warranties" className="widget__link">
          {t.warranties.widget.viewAll}
        </Link>
      </div>
      <div className="widget__content">
        {warranties.length === 0 ? (
          <p className="widget__empty">{t.warranties.widget.noExpiringWarranties.replace('{days}', daysAhead.toString())}</p>
        ) : (
          <ul className="widget__list">
            {warranties.slice(0, 5).map((warranty) => (
              <li key={warranty.id} className="widget__item">
                <div className="widget__item-link">
                  <div className="widget__item-header">
                    <span className="widget__item-title">
                      {warranty.ticket?.ticketNumber || 'N/A'} - {warranty.customer?.name || warranty.ticket?.customerName || t.warranties.card.unknownCustomer}
                    </span>
                    <WarrantyStatusBadge status={warranty.status} expiryDate={warranty.expiryDate} />
                  </div>
                  <div className="widget__item-meta">
                    <span>{t.warranties.widget.expires} {formatDate(warranty.expiryDate)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


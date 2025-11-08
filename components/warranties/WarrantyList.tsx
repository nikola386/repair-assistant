'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import WarrantyTable from './WarrantyTable'
import Spinner from '../ui/Spinner'
import MultiSelect from '../ui/MultiSelect'
import { Warranty } from '@/types/warranty'

interface WarrantyListProps {
  refreshTrigger?: number | string
}

export default function WarrantyList({ refreshTrigger }: WarrantyListProps) {
  const { t } = useLanguage()
  
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  
  useEffect(() => {
    fetchWarranties()
  }, [statusFilter, refreshTrigger])

  const fetchWarranties = async () => {
    setIsLoading(true)
    try {
      // Fetch all warranties and filter client-side
      const response = await fetch('/api/warranties')
      if (response.ok) {
        const data = await response.json()
        let filteredWarranties = data.warranties || []
        
        // Filter by selected statuses
        if (statusFilter.length > 0) {
          filteredWarranties = filteredWarranties.filter((w: Warranty) => 
            statusFilter.includes(w.status)
          )
        }
        
        setWarranties(filteredWarranties)
      }
    } catch (error) {
      console.error('Error fetching warranties:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusFilterChange = (values: string[]) => {
    setStatusFilter(values)
  }

  const handleWarrantyUpdate = (updatedWarranty: Warranty) => {
    setWarranties((prev) =>
      prev.map((w) => (w.id === updatedWarranty.id ? updatedWarranty : w))
    )
  }

  return (
    <div className="ticket-list">
      <div className="ticket-list__header">
        <div className="ticket-list__filters">
          <div className="ticket-list__filter-group">
            <label htmlFor="status-filter">{t.warranties.filter.status}</label>
            <MultiSelect
              id="status-filter"
              options={[
                { value: 'active', label: t.warranties.status.active },
                { value: 'expired', label: t.warranties.status.expired },
                { value: 'voided', label: t.warranties.status.voided },
                { value: 'claimed', label: t.warranties.status.claimed },
              ]}
              selectedValues={statusFilter}
              onChange={handleStatusFilterChange}
              placeholder={t.warranties.filter.allStatuses}
              allLabel={t.warranties.filter.allStatuses}
              className=""
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="ticket-list__loading spinner-container spinner-container--inline">
          <Spinner size="large" />
          <p>{t.warranties.loadingWarranties}</p>
        </div>
      ) : warranties.length === 0 ? (
        <div className="ticket-list__empty">
          <p>{t.warranties.noWarrantiesFound}</p>
        </div>
      ) : (
        <WarrantyTable warranties={warranties} onWarrantyUpdate={handleWarrantyUpdate} />
      )}
    </div>
  )
}


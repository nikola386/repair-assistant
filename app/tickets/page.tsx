'use client'

import { useState } from 'react'
import Link from 'next/link'
import TicketList from '@/components/tickets/TicketList'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function TicketsPage() {
  const { t } = useLanguage()
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    limit: 12,
    search: '',
    status: '',
    priority: '',
  })

  const handleFiltersChange = (filters: { search?: string; status?: string; priority?: string }) => {
    setPaginationParams((prev) => ({
      ...prev,
      ...filters,
      page: 1, // Reset to first page when filters change
    }))
  }

  const handlePaginationChange = (page: number, limit: number) => {
    setPaginationParams((prev) => ({ ...prev, page, limit }))
  }

  return (
    <>
      <Navigation />
      <main className="tickets-page">
        <div className="container">
          <div className="tickets-page__header">
            <h1>{t.tickets.title}</h1>
            <Link
              href="/tickets/new"
              className="btn btn-primary btn-sm"
            >
              {t.tickets.createNew}
            </Link>
          </div>

          <TicketList
            onFiltersChange={handleFiltersChange}
            onPaginationChange={handlePaginationChange}
            initialFilters={paginationParams}
          />
        </div>
      </main>
    </>
  )
}


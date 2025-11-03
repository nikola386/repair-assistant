'use client'

import Link from 'next/link'
import TicketList from '@/components/tickets/TicketList'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function TicketsPage() {
  const { t } = useLanguage()

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

          <TicketList />
        </div>
      </main>
    </>
  )
}


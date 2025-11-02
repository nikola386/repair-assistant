'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import TicketTable from '@/components/tickets/TicketTable'
import Spinner from '@/components/ui/Spinner'
import { RepairTicket } from '@/types/ticket'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  ticketCount: number
  createdAt: string
  updatedAt: string
}

interface CustomerDetailResponse {
  customer: Customer
  tickets: RepairTicket[]
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [tickets, setTickets] = useState<RepairTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const customerId = params.id as string

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/customers/${customerId}`)
        if (response.ok) {
          const data: CustomerDetailResponse = await response.json()
          setCustomer(data.customer)
          setTickets(data.tickets)
        } else if (response.status === 404) {
          setError('Customer not found')
        } else {
          setError('Failed to load customer details')
        }
      } catch (error) {
        console.error('Error fetching customer details:', error)
        setError('Failed to load customer details')
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchCustomerDetails()
    }
  }, [customerId])

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="client-detail-page">
          <div className="container">
            <div className="client-detail-page__loading">
              <Spinner size="large" />
              <p>{t.auth?.loading || 'Loading...'}</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  if (error || !customer) {
    return (
      <>
        <Navigation />
        <main className="client-detail-page">
          <div className="container">
            <div className="client-detail-page__error">
              <p>{error || 'Customer not found'}</p>
              <Link href="/clients" className="btn btn-primary">
                {t.tickets?.backToList || 'Back to Clients'}
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <main className="client-detail-page">
        <div className="container">
          <div className="client-detail-page__header">
            <Link href="/clients" className="client-detail-page__back">
              ← {t.tickets?.backToList || 'Back to Clients'}
            </Link>
            <h1>{customer.name}</h1>
          </div>

          <div className="client-detail-page__content">
            <div className="client-detail-page__info">
              <div className="client-detail-page__section">
                <h2>{t.tickets?.customerInfo || 'Customer Information'}</h2>
                <div className="client-detail-page__info-grid">
                  <div>
                    <label>{t.tickets?.form?.customerName || 'Name'}</label>
                    <p>{customer.name}</p>
                  </div>
                  <div>
                    <label>{t.tickets?.form?.customerEmail || 'Email'}</label>
                    <p>
                      <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    </p>
                  </div>
                  <div>
                    <label>{t.tickets?.form?.customerPhone || 'Phone'}</label>
                    <p>
                      <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                    </p>
                  </div>
                  <div>
                    <label>{t.clients?.totalTickets || 'Total Tickets'}</label>
                    <p>{customer.ticketCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="client-detail-page__tickets">
              <h2>{t.clients?.repairs || 'Repairs'}</h2>
              {tickets.length === 0 ? (
                <div className="client-detail-page__empty">
                  <p>{t.clients?.noRepairs || 'No repairs found for this client'}</p>
                </div>
              ) : (
                <TicketTable tickets={tickets} />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}


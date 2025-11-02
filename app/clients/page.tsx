'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  ticketCount: number
  createdAt: string
  updatedAt: string
}

interface CustomersResponse {
  customers: Customer[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function ClientsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (debouncedSearch.trim()) {
          params.append('search', debouncedSearch.trim())
        }
        params.append('page', '1')
        params.append('limit', '100')

        const response = await fetch(`/api/customers?${params.toString()}`)
        if (response.ok) {
          const data: CustomersResponse = await response.json()
          setCustomers(data.customers)
        }
      } catch (error) {
        console.error('Error fetching customers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [debouncedSearch])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setDebouncedSearch(search)
    }
  }

  return (
    <>
      <Navigation />
      <main className="clients-page">
        <div className="container">
          <div className="clients-page__header">
            <h1>{t.clients?.title || 'Clients'}</h1>
          </div>

          <div className="clients-page__content">
            <div className="clients-page__search">
              <input
                type="text"
                placeholder={t.clients?.searchPlaceholder || 'Search clients...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="clients-page__search-input"
              />
            </div>

            {loading ? (
              <div className="clients-page__loading">
                <Spinner size="large" />
                <p>{t.auth?.loading || 'Loading...'}</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="clients-page__empty">
                <p>{t.clients?.noClientsFound || 'No clients found'}</p>
              </div>
            ) : (
              <div className="clients-page__list">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>{t.clients?.name || 'Name'}</th>
                      <th>{t.clients?.email || 'Email'}</th>
                      <th>{t.clients?.phone || 'Phone'}</th>
                      <th>{t.clients?.tickets || 'Tickets'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr 
                        key={customer.id} 
                        className="clients-table__row"
                        onClick={() => router.push(`/clients/${customer.id}`)}
                      >
                        <td>{customer.name}</td>
                        <td>
                          <a href={`mailto:${customer.email}`} className="clients-table__link" onClick={(e) => e.stopPropagation()}>
                            {customer.email}
                          </a>
                        </td>
                        <td>
                          <a href={`tel:${customer.phone}`} className="clients-table__link" onClick={(e) => e.stopPropagation()}>
                            {customer.phone}
                          </a>
                        </td>
                        <td>{customer.ticketCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}


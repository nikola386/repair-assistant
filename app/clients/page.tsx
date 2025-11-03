'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import {
  defaultClientsFilters,
  ClientsFilters,
  parseClientsFiltersFromUrl,
  syncClientsFiltersToUrl
} from '@/lib/urlParams'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  ticketCount: number
  createdAt: string
  updatedAt: string
}

interface ClientsCacheData {
  customers: Customer[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const generateCacheKey = (filters: ClientsFilters): string => {
  return `${filters.page}-${filters.limit}-${filters.search || ''}`
}

export default function ClientsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  
  // Initialize filters from URL params on first render (synchronously)
  const getInitialFilters = (): ClientsFilters => {
    if (typeof window === 'undefined') return { ...defaultClientsFilters }
    const searchParams = new URLSearchParams(window.location.search)
    const urlFilters = parseClientsFiltersFromUrl(searchParams)
    return Object.keys(urlFilters).length > 0
      ? { ...defaultClientsFilters, ...urlFilters }
      : { ...defaultClientsFilters }
  }
  
  // Local state - initialized from URL params
  const [filters, setFiltersState] = useState<ClientsFilters>(getInitialFilters)
  const [clientsData, setClientsData] = useState<Customer[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Simple cache using useRef (component-level, cleared on unmount)
  const cacheRef = useRef<Map<string, ClientsCacheData>>(new Map())
  
  // Local state for UI (search query before debounce/search action) - initialized from URL
  const [search, setSearch] = useState(filters.search || '')

  // Sync filters from URL and update state
  const syncFiltersFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return
    
    const searchParams = new URLSearchParams(window.location.search)
    const urlFilters = parseClientsFiltersFromUrl(searchParams)
    
    const updatedFilters = Object.keys(urlFilters).length > 0
      ? { ...defaultClientsFilters, ...urlFilters }
      : { ...defaultClientsFilters }
    
    setFiltersState(updatedFilters)
    setSearch(updatedFilters.search || '')
  }, [])
  
  // Set filters and optionally update URL
  const setFilters = useCallback((newFilters: Partial<ClientsFilters>, updateUrl: boolean = true) => {
    setFiltersState((prev) => {
      const updatedFilters = { ...prev, ...newFilters }
      // Reset to page 1 when search changes
      if (newFilters.search !== undefined && !newFilters.page) {
        updatedFilters.page = 1
      }
      
      // Sync to URL
      if (updateUrl && typeof window !== 'undefined') {
        syncClientsFiltersToUrl(updatedFilters, window.location.pathname)
      }
      
      return updatedFilters
    })
  }, [])
  
  
  // Sync local UI state with filters (when URL changes or filters are updated externally)
  useEffect(() => {
    setSearch(filters.search || '')
  }, [filters.search])
  
  // Listen to URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      syncFiltersFromUrl()
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [syncFiltersFromUrl])
  
  // Fetch clients when filters change (using filters directly to avoid stale closures)
  useEffect(() => {
    const cacheKey = generateCacheKey(filters)
    
    // Check cache first
    const cachedData = cacheRef.current.get(cacheKey)
    if (cachedData) {
      setClientsData(cachedData.customers)
      setPagination({
        page: cachedData.page,
        limit: cachedData.limit,
        total: cachedData.total,
        totalPages: cachedData.totalPages,
      })
      setIsLoading(false)
      setError(null)
      return
    }
    
    // Fetch from API
    setIsLoading(true)
    setError(null)
    
    const params = new URLSearchParams()
    params.append('page', filters.page.toString())
    params.append('limit', filters.limit.toString())
    if (filters.search.trim()) params.append('search', filters.search.trim())
    
    fetch(`/api/customers?${params.toString()}`)
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json()
          
          // Store in cache
          cacheRef.current.set(cacheKey, data)
          
          setClientsData(data.customers)
          setPagination({
            page: data.page,
            limit: data.limit,
            total: data.total,
            totalPages: data.totalPages,
          })
          setIsLoading(false)
          setError(null)
        } else {
          throw new Error('Failed to fetch clients')
        }
      })
      .catch((error) => {
        console.error('Error fetching clients:', error)
        setIsLoading(false)
        setError(error instanceof Error ? error.message : 'Failed to fetch clients')
      })
  }, [filters.search, filters.page, filters.limit])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setFilters({ search, page: 1 })
    }
  }
  
  const handleSearchChange = (value: string) => {
    setSearch(value)
  }
  
  const triggerSearch = () => {
    setFilters({ search, page: 1 })
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
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="clients-page__search-input"
              />
              <button
                type="button"
                onClick={triggerSearch}
                className="clients-page__search-button"
                aria-label="Search"
                title="Search"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {isLoading ? (
              <div className="clients-page__loading">
                <Spinner size="large" />
                <p>{t.auth?.loading || 'Loading...'}</p>
              </div>
            ) : clientsData.length === 0 ? (
              <div className="clients-page__empty">
                <p>{t.clients?.noClientsFound || 'No clients found'}</p>
              </div>
            ) : (
              <div className="clients-page__list">
                <div className="clients-table">
                  <div className="clients-table__table-container">
                    <table className="clients-table__table">
                  <thead>
                    <tr>
                      <th>{t.clients?.name || 'Name'}</th>
                      <th>{t.clients?.email || 'Email'}</th>
                      <th>{t.clients?.phone || 'Phone'}</th>
                      <th>{t.clients?.tickets || 'Tickets'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsData.map((customer) => (
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
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import MultiSelect from '@/components/ui/MultiSelect'
import WarrantyTable from '@/components/warranties/WarrantyTable'
import Pagination from '@/components/ui/Pagination'
import { Warranty } from '@/types/warranty'

function WarrantyPageContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Convert comma-separated string to array for multi-select
  const parseFilterArray = (value: string | undefined): string[] => {
    if (!value) return []
    return value.split(',').map(v => v.trim()).filter(Boolean)
  }

  // Initialize filters from URL params
  const getFiltersFromUrl = () => {
    return {
      search: searchParams.get('search') || '',
      status: searchParams.get('status') || '', // Can be comma-separated
    }
  }
  
  const [filters, setFilters] = useState(getFiltersFromUrl)
  // Local state for UI (arrays for multi-select)
  const [statusFilter, setStatusFilter] = useState<string[]>(parseFilterArray(filters.status))
  
  // Sync filters and pagination when URL changes
  const prevFiltersRef = useRef(filters)
  useEffect(() => {
    const urlFilters = {
      search: searchParams.get('search') || '',
      status: searchParams.get('status') || '',
    }
    const urlPage = parseInt(searchParams.get('page') || '1')
    const urlLimit = parseInt(searchParams.get('limit') || '50')
    
    const hasChanged = 
      urlFilters.search !== prevFiltersRef.current.search ||
      urlFilters.status !== prevFiltersRef.current.status ||
      urlPage !== pagination.page ||
      urlLimit !== pagination.limit
    
    if (hasChanged) {
      setFilters(urlFilters)
      setStatusFilter(parseFilterArray(urlFilters.status))
      setPagination(prev => ({
        ...prev,
        page: urlPage,
        limit: urlLimit,
      }))
      prevFiltersRef.current = urlFilters
    }
  }, [searchParams, pagination.page, pagination.limit])

  // Fetch warranties
  const fetchWarranties = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      if (filters.search.trim()) params.append('search', filters.search.trim())
      const statusValue = statusFilter.length > 0 ? statusFilter.join(',') : ''
      if (statusValue) params.append('status', statusValue)

      const response = await fetch(`/api/warranties?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setWarranties(data.warranties || [])
        setPagination(prev => ({
          ...prev,
          page: data.page || 1,
          limit: data.limit || 50,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        }))
      } else {
        throw new Error('Failed to fetch warranties')
      }
    } catch (error) {
      console.error('Error fetching warranties:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch warranties')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, filters, statusFilter])

  useEffect(() => {
    fetchWarranties()
  }, [fetchWarranties])

  // Sync filters to URL
  const syncFiltersToUrl = useCallback((newFilters: typeof filters, newPagination = pagination, newStatusFilter = statusFilter) => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams()
    
    if (newFilters.search.trim()) params.set('search', newFilters.search.trim())
    const statusValue = newStatusFilter.length > 0 ? newStatusFilter.join(',') : ''
    if (statusValue) params.set('status', statusValue)
    if (newPagination.page > 1) params.set('page', newPagination.page.toString())
    if (newPagination.limit !== 50) params.set('limit', newPagination.limit.toString())
    
    const newUrl = params.toString() 
      ? `${pathname}?${params.toString()}`
      : pathname
    
    window.history.replaceState({}, '', newUrl)
  }, [pagination, pathname, statusFilter])

  const handleSearch = () => {
    const newPagination = { ...pagination, page: 1 }
    setPagination(newPagination)
    syncFiltersToUrl(filters, newPagination, statusFilter)
    fetchWarranties()
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleWarrantyUpdate = async (updatedWarranty: Warranty) => {
    setWarranties((prev) =>
      prev.map((w) => (w.id === updatedWarranty.id ? updatedWarranty : w))
    )
    await fetchWarranties()
  }

  return (
    <>
      <Navigation />
      <main className="inventory-page">
        <div className="container">
          <div className="inventory-page__header">
            <h1>{t.warranties.title}</h1>
          </div>

          <div className="inventory-page__content">
            <div className="inventory-page__filters">
              <div className="inventory-page__search">
                <input
                  type="text"
                  placeholder={t.warranties.searchPlaceholder}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyDown={handleSearchKeyDown}
                  className="inventory-page__search-input"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="inventory-page__search-button"
                  aria-label="Search"
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

              <div className="inventory-page__filter-group">
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
                  onChange={(values) => {
                    setStatusFilter(values)
                    const statusValue = values.length > 0 ? values.join(',') : ''
                    const newFilters = { ...filters, status: statusValue }
                    setFilters(newFilters)
                    const newPagination = { ...pagination, page: 1 }
                    setPagination(newPagination)
                    syncFiltersToUrl(newFilters, newPagination, values)
                  }}
                  placeholder={t.warranties.filter.allStatuses}
                  allLabel={t.warranties.filter.allStatuses}
                />
              </div>

              <div className="inventory-page__filter-group">
                <label htmlFor="limit-select">Items per page:</label>
                <select
                  id="limit-select"
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value)
                    const newPagination = { ...pagination, limit: newLimit, page: 1 }
                    setPagination(newPagination)
                    syncFiltersToUrl(filters, newPagination, statusFilter)
                  }}
                  className="inventory-page__filter"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="inventory-page__loading">
                <Spinner size="large" />
                <p>{t.common.messages.loading}</p>
              </div>
            ) : error ? (
              <div className="inventory-page__error">
                <p>{error}</p>
              </div>
            ) : warranties.length === 0 ? (
              <div className="inventory-page__empty">
                <p>{t.warranties.noWarrantiesFound}</p>
              </div>
            ) : (
              <>
                <WarrantyTable
                  warranties={warranties}
                  onWarrantyUpdate={handleWarrantyUpdate}
                  isLoading={isLoading}
                />
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => {
                    const newPagination = { ...pagination, page }
                    setPagination(newPagination)
                    syncFiltersToUrl(filters, newPagination, statusFilter)
                  }}
                  disabled={isLoading}
                  className="inventory-page__pagination-wrapper"
                />
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default function WarrantiesPage() {
  return (
    <Suspense fallback={
      <>
        <Navigation />
        <main className="inventory-page">
          <div className="container">
            <div className="loading-state">
              <Spinner />
            </div>
          </div>
        </main>
      </>
    }>
      <WarrantyPageContent />
    </Suspense>
  )
}

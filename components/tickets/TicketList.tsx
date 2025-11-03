'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import TicketTable from './TicketTable'
import Spinner from '../ui/Spinner'
import { 
  defaultTicketsFilters, 
  TicketsFilters,
  parseTicketsFiltersFromUrl,
  syncTicketsFiltersToUrl 
} from '@/lib/urlParams'
import { RepairTicket, PaginatedTicketsResponse } from '@/types/ticket'

interface TicketListProps {
  onRefresh?: () => Promise<any>
  isLoading?: boolean
  onFiltersChange?: (filters: { search?: string; status?: string; priority?: string }) => void
  onPaginationChange?: (page: number, limit: number) => void
  initialFilters?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    priority?: string
  }
  refreshTrigger?: number | string // Trigger refresh when this value changes
}

const generateCacheKey = (filters: TicketsFilters): string => {
  return `${filters.page}-${filters.limit}-${filters.search || ''}-${filters.status || ''}-${filters.priority || ''}`
}

export default function TicketList({
  onRefresh,
  isLoading = false,
  onFiltersChange,
  onPaginationChange,
  initialFilters = {},
  refreshTrigger,
}: TicketListProps) {
  const { t } = useLanguage()
  
  // Initialize filters from URL params on first render (synchronously)
  const getInitialFilters = (): TicketsFilters => {
    if (typeof window === 'undefined') return { ...defaultTicketsFilters }
    const searchParams = new URLSearchParams(window.location.search)
    const urlFilters = parseTicketsFiltersFromUrl(searchParams)
    return Object.keys(urlFilters).length > 0
      ? { ...defaultTicketsFilters, ...urlFilters }
      : { ...defaultTicketsFilters }
  }
  
  // Local state - initialized from URL params
  const [filters, setFiltersState] = useState<TicketsFilters>(getInitialFilters)
  const [ticketsData, setTicketsData] = useState<RepairTicket[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  })
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Simple cache using useRef (component-level, cleared on unmount)
  const cacheRef = useRef<Map<string, PaginatedTicketsResponse>>(new Map())
  
  // Local state for UI (search query before debounce/search action) - initialized from URL
  const [searchQuery, setSearchQuery] = useState(filters.search || '')
  const [statusFilter, setStatusFilter] = useState<string>(filters.status || 'all')
  const [priorityFilter, setPriorityFilter] = useState<string>(filters.priority || 'all')
  
  // Sync filters from URL and update state
  const syncFiltersFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return
    
    const searchParams = new URLSearchParams(window.location.search)
    const urlFilters = parseTicketsFiltersFromUrl(searchParams)
    
    const updatedFilters = Object.keys(urlFilters).length > 0
      ? { ...defaultTicketsFilters, ...urlFilters }
      : { ...defaultTicketsFilters }
    
    setFiltersState(updatedFilters)
    setSearchQuery(updatedFilters.search || '')
    setStatusFilter(updatedFilters.status || 'all')
    setPriorityFilter(updatedFilters.priority || 'all')
  }, [])
  
  // Set filters and optionally update URL
  const setFilters = useCallback((newFilters: Partial<TicketsFilters>, updateUrl: boolean = true) => {
    setFiltersState((prev) => {
      const updatedFilters = { ...prev, ...newFilters }
      // Reset to page 1 when filters change (except when page itself is being set)
      if (!newFilters.page && (newFilters.search !== undefined || newFilters.status !== undefined || newFilters.priority !== undefined || newFilters.limit !== undefined)) {
        updatedFilters.page = 1
      }
      
      // Sync to URL
      if (updateUrl && typeof window !== 'undefined') {
        syncTicketsFiltersToUrl(updatedFilters, window.location.pathname)
      }
      
      return updatedFilters
    })
  }, [])
  
  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])
  
  // Handle initial filters prop (for backward compatibility)
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters({
        page: initialFilters.page || 1,
        limit: initialFilters.limit || 12,
        search: initialFilters.search || '',
        status: initialFilters.status || '',
        priority: initialFilters.priority || '',
      }, false) // Don't update URL since we're initializing
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Sync local UI state with filters (when URL changes or filters are updated externally)
  useEffect(() => {
    setSearchQuery(filters.search || '')
    setStatusFilter(filters.status || 'all')
    setPriorityFilter(filters.priority || 'all')
  }, [filters.search, filters.status, filters.priority])
  
  // Listen to URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      syncFiltersFromUrl()
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [syncFiltersFromUrl])
  
  // Fetch tickets when filters change (using filters directly to avoid stale closures)
  useEffect(() => {
    const cacheKey = generateCacheKey(filters)
    
    // Check cache first
    const cachedData = cacheRef.current.get(cacheKey)
    if (cachedData) {
      setTicketsData(cachedData.tickets)
      setPagination({
        page: cachedData.page,
        limit: cachedData.limit,
        total: cachedData.total,
        totalPages: cachedData.totalPages,
      })
      setIsLoadingData(false)
      setError(null)
      return
    }
    
    // Fetch from API
    setIsLoadingData(true)
    setError(null)
    
    const params = new URLSearchParams()
    params.append('page', filters.page.toString())
    params.append('limit', filters.limit.toString())
    if (filters.search.trim()) params.append('search', filters.search.trim())
    if (filters.status) params.append('status', filters.status)
    if (filters.priority) params.append('priority', filters.priority)
    
    fetch(`/api/tickets?${params.toString()}`)
      .then(async (response) => {
        if (response.ok) {
          const data: PaginatedTicketsResponse = await response.json()
          
          // Store in cache
          cacheRef.current.set(cacheKey, data)
          
          setTicketsData(data.tickets)
          setPagination({
            page: data.page,
            limit: data.limit,
            total: data.total,
            totalPages: data.totalPages,
          })
          setIsLoadingData(false)
          setError(null)
        } else {
          throw new Error('Failed to fetch tickets')
        }
      })
      .catch((error) => {
        console.error('Error fetching tickets:', error)
        setIsLoadingData(false)
        setError(error instanceof Error ? error.message : 'Failed to fetch tickets')
      })
  }, [filters.page, filters.limit, filters.search, filters.status, filters.priority])
  
  // Clear cache and refetch when refreshTrigger changes (e.g., after creating/updating a ticket)
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      clearCache()
      // Force refetch by triggering the filters effect
      // We'll just set filters to current values to trigger the fetch
      setFiltersState((prev) => ({ ...prev }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Function to trigger search manually (on Enter or button click)
  const triggerSearch = () => {
    setFilters({
      search: searchQuery,
      status: statusFilter !== 'all' ? statusFilter : '',
      priority: priorityFilter !== 'all' ? priorityFilter : '',
      page: 1, // Reset to first page on new search
    })
    if (onFiltersChange) {
      onFiltersChange({ 
        search: searchQuery, 
        status: statusFilter !== 'all' ? statusFilter : undefined, 
        priority: priorityFilter !== 'all' ? priorityFilter : undefined 
      })
    }
  }

  // Handle Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      triggerSearch()
    }
  }

  const handleSearchChange = (value: string) => {
    // Only update the search query state, don't trigger search automatically
    setSearchQuery(value)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setFilters({
      status: value !== 'all' ? value : '',
      page: 1, // Reset to first page when filter changes
    })
    if (onFiltersChange) {
      onFiltersChange({ 
        search: filters.search || undefined, 
        status: value !== 'all' ? value : undefined, 
        priority: priorityFilter !== 'all' ? priorityFilter : undefined 
      })
    }
  }

  const handlePriorityFilterChange = (value: string) => {
    setPriorityFilter(value)
    setFilters({
      priority: value !== 'all' ? value : '',
      page: 1, // Reset to first page when filter changes
    })
    if (onFiltersChange) {
      onFiltersChange({ 
        search: filters.search || undefined, 
        status: statusFilter !== 'all' ? statusFilter : undefined, 
        priority: value !== 'all' ? value : undefined 
      })
    }
  }

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage })
    if (onPaginationChange) {
      onPaginationChange(newPage, pagination.limit)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setFilters({ limit: newLimit, page: 1 })
    if (onPaginationChange) {
      onPaginationChange(1, newLimit)
    }
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
    }
    clearCache()
    // Force refetch by updating filters
    setFiltersState((prev) => ({ ...prev }))
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const { page, totalPages } = pagination
    const pages: (number | string)[] = []
    const maxVisible = 7 // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (page <= 4) {
        // Show pages 1-5, then ellipsis, then last page
        for (let i = 2; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('ellipsis-end')
        pages.push(totalPages)
      } else if (page >= totalPages - 3) {
        // Show first page, ellipsis, then last 5 pages
        pages.push('ellipsis-start')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Show first page, ellipsis, current page and neighbors, ellipsis, last page
        pages.push('ellipsis-start')
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis-end')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="ticket-list">
      <div className="ticket-list__header">
        <div className="ticket-list__filters">
          <div className="ticket-list__search">
            <input
              type="text"
              placeholder={t.tickets.searchPlaceholder || 'Search tickets...'}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="ticket-list__search-input"
            />
            <button
              type="button"
              onClick={triggerSearch}
              className="ticket-list__search-button"
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
          <div className="ticket-list__filter-group">
            <label htmlFor="status-filter">{t.tickets.filterByStatus || 'Status'}:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="ticket-list__filter"
            >
              <option value="all">{t.tickets.allStatuses || 'All Statuses'}</option>
              <option value="pending">{t.common.status.pending}</option>
              <option value="in_progress">{t.common.status.in_progress}</option>
              <option value="waiting_parts">{t.common.status.waiting_parts}</option>
              <option value="completed">{t.common.status.completed}</option>
              <option value="cancelled">{t.common.status.cancelled}</option>
            </select>
          </div>
          <div className="ticket-list__filter-group">
            <label htmlFor="priority-filter">{t.tickets.filterByPriority || 'Priority'}:</label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(e) => handlePriorityFilterChange(e.target.value)}
              className="ticket-list__filter"
            >
              <option value="all">{t.tickets.allPriorities || 'All Priorities'}</option>
              <option value="low">{t.common.priority.low}</option>
              <option value="medium">{t.common.priority.medium}</option>
              <option value="high">{t.common.priority.high}</option>
              <option value="urgent">{t.common.priority.urgent}</option>
            </select>
          </div>
        </div>

        <div className="ticket-list__view-controls">
          <div className="ticket-list__items-per-page ticket-list__filter-group">
            <label htmlFor="items-per-page">{t.common.messages.itemsPerPage}</label>
            <select
              id="items-per-page"
              value={pagination.limit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value))}
              className="ticket-list__filter"
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="48">48</option>
              <option value="96">96</option>
            </select>
          </div>
        </div>
      </div>

      <div className="ticket-list__count">
        {t.tickets?.showingResults
          ? t.tickets.showingResults
              .replace('{count}', ticketsData.length.toString())
              .replace('{total}', pagination.total.toString())
          : `Showing ${ticketsData.length} of ${pagination.total} tickets`}
      </div>

      {isLoading || isLoadingData ? (
        <div className="ticket-list__loading spinner-container spinner-container--inline">
          <Spinner size="large" />
          <p>{t.tickets.list.loadingTickets}</p>
        </div>
      ) : ticketsData.length === 0 ? (
        <div className="ticket-list__empty">
          <p>{t.tickets?.noTicketsFound || 'No tickets found'}</p>
        </div>
      ) : (
        <>
          <TicketTable tickets={ticketsData} />

          {pagination.totalPages > 1 && (
            <div className="ticket-list__pagination">
              <button
                className="ticket-list__pagination-arrow"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                aria-label="Previous page"
                title="Previous page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="ticket-list__pagination-numbers">
                {getPageNumbers().map((pageNum, index) => {
                  if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
                    return (
                      <span key={`ellipsis-${index}`} className="ticket-list__pagination-ellipsis">
                        ...
                      </span>
                    )
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`ticket-list__pagination-number ${
                        pageNum === pagination.page ? 'active' : ''
                      }`}
                      onClick={() => handlePageChange(pageNum as number)}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={pageNum === pagination.page ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                className="ticket-list__pagination-arrow"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Next page"
                title="Next page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.646 1.646a.5.5 0 01.708 0l6 6a.5.5 0 010 .708l-6 6a.5.5 0 01-.708-.708L10.293 8 4.646 2.354a.5.5 0 010-.708z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

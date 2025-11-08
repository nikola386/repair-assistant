'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { useLanguage } from '../../contexts/LanguageContext'
import TicketTable from './TicketTable'
import Spinner from '../ui/Spinner'
import MultiSelect from '../ui/MultiSelect'
import Pagination from '../ui/Pagination'
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

const parseFilterArray = (value: string | undefined): string[] => {
  if (!value) return []
  return value.split(',').map(v => v.trim()).filter(Boolean)
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
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const getInitialFilters = (): TicketsFilters => {
    if (typeof window === 'undefined') return { ...defaultTicketsFilters }
    const urlFilters = parseTicketsFiltersFromUrl(searchParams)
    return Object.keys(urlFilters).length > 0
      ? { ...defaultTicketsFilters, ...urlFilters }
      : { ...defaultTicketsFilters }
  }
  
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
  
  const cacheRef = useRef<Map<string, PaginatedTicketsResponse>>(new Map())
  
  const [searchQuery, setSearchQuery] = useState(filters.search || '')
  const [statusFilter, setStatusFilter] = useState<string[]>(parseFilterArray(filters.status))
  const [priorityFilter, setPriorityFilter] = useState<string[]>(parseFilterArray(filters.priority))
  
  const syncFiltersFromUrl = useCallback(() => {
    const urlFilters = parseTicketsFiltersFromUrl(searchParams)
    
    const updatedFilters = Object.keys(urlFilters).length > 0
      ? { ...defaultTicketsFilters, ...urlFilters }
      : { ...defaultTicketsFilters }
    
    setFiltersState(updatedFilters)
    setSearchQuery(updatedFilters.search || '')
    setStatusFilter(parseFilterArray(updatedFilters.status))
    setPriorityFilter(parseFilterArray(updatedFilters.priority))
  }, [searchParams])
  
  const setFilters = useCallback((newFilters: Partial<TicketsFilters>, updateUrl: boolean = true) => {
    setFiltersState((prev) => {
      const updatedFilters = { ...prev, ...newFilters }
      if (!newFilters.page && (newFilters.search !== undefined || newFilters.status !== undefined || newFilters.priority !== undefined || newFilters.limit !== undefined)) {
        updatedFilters.page = 1
      }
      
      if (updateUrl && typeof window !== 'undefined') {
        syncTicketsFiltersToUrl(updatedFilters, window.location.pathname)
      }
      
      return updatedFilters
    })
  }, [])
  
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters({
        page: initialFilters.page || 1,
        limit: initialFilters.limit || 12,
        search: initialFilters.search || '',
        status: initialFilters.status || '',
        priority: initialFilters.priority || '',
      }, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSearchQuery(filters.search || '')
    setStatusFilter(parseFilterArray(filters.status))
    setPriorityFilter(parseFilterArray(filters.priority))
  }, [filters.search, filters.status, filters.priority])
  
  useEffect(() => {
    const handlePopState = () => {
      syncFiltersFromUrl()
    }
    
    window.addEventListener('popstate', handlePopState)
    
    syncFiltersFromUrl()
    
    return () => window.removeEventListener('popstate', handlePopState)
  }, [syncFiltersFromUrl])
  
  useEffect(() => {
    const cacheKey = generateCacheKey(filters)
    
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
  
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      clearCache()
      setFiltersState((prev) => ({ ...prev }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const triggerSearch = () => {
    const statusValue = statusFilter.length > 0 ? statusFilter.join(',') : ''
    const priorityValue = priorityFilter.length > 0 ? priorityFilter.join(',') : ''
    setFilters({
      search: searchQuery,
      status: statusValue,
      priority: priorityValue,
      page: 1, // Reset to first page on new search
    })
    if (onFiltersChange) {
      onFiltersChange({ 
        search: searchQuery, 
        status: statusValue || undefined, 
        priority: priorityValue || undefined 
      })
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      triggerSearch()
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleStatusFilterChange = (values: string[]) => {
    setStatusFilter(values)
    const statusValue = values.length > 0 ? values.join(',') : ''
    setFilters({
      status: statusValue,
      page: 1, // Reset to first page when filter changes
    })
    if (onFiltersChange) {
      const priorityValue = priorityFilter.length > 0 ? priorityFilter.join(',') : ''
      onFiltersChange({ 
        search: filters.search || undefined, 
        status: statusValue || undefined, 
        priority: priorityValue || undefined 
      })
    }
  }

  const handlePriorityFilterChange = (values: string[]) => {
    setPriorityFilter(values)
    const priorityValue = values.length > 0 ? values.join(',') : ''
    setFilters({
      priority: priorityValue,
      page: 1, // Reset to first page when filter changes
    })
    if (onFiltersChange) {
      const statusValue = statusFilter.length > 0 ? statusFilter.join(',') : ''
      onFiltersChange({ 
        search: filters.search || undefined, 
        status: statusValue || undefined, 
        priority: priorityValue || undefined 
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
    setFiltersState((prev) => ({ ...prev }))
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
            <MultiSelect
              id="status-filter"
              options={[
                { value: 'pending', label: t.common.status.pending },
                { value: 'in_progress', label: t.common.status.in_progress },
                { value: 'waiting_parts', label: t.common.status.waiting_parts },
                { value: 'completed', label: t.common.status.completed },
                { value: 'cancelled', label: t.common.status.cancelled },
              ]}
              selectedValues={statusFilter}
              onChange={handleStatusFilterChange}
              placeholder={t.tickets.allStatuses || 'All Statuses'}
              allLabel={t.tickets.allStatuses || 'All Statuses'}
              className=""
            />
          </div>
          <div className="ticket-list__filter-group">
            <label htmlFor="priority-filter">{t.tickets.filterByPriority || 'Priority'}:</label>
            <MultiSelect
              id="priority-filter"
              options={[
                { value: 'low', label: t.common.priority.low },
                { value: 'medium', label: t.common.priority.medium },
                { value: 'high', label: t.common.priority.high },
                { value: 'urgent', label: t.common.priority.urgent },
              ]}
              selectedValues={priorityFilter}
              onChange={handlePriorityFilterChange}
              placeholder={t.tickets.allPriorities || 'All Priorities'}
              allLabel={t.tickets.allPriorities || 'All Priorities'}
              className=""
            />
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

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            disabled={isLoading || isLoadingData}
          />
        </>
      )}
    </div>
  )
}

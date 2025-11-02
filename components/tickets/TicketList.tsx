'use client'

import { useState, useEffect, useCallback } from 'react'
import { RepairTicket, PaginatedTicketsResponse } from '../../types/ticket'
import { useLanguage } from '../../contexts/LanguageContext'
import TicketTable from './TicketTable'
import Spinner from '../ui/Spinner'

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

export default function TicketList({
  onRefresh,
  isLoading = false,
  onFiltersChange,
  onPaginationChange,
  initialFilters = {},
  refreshTrigger,
}: TicketListProps) {
  const { t } = useLanguage()
  const [tickets, setTickets] = useState<RepairTicket[]>([])
  const [pagination, setPagination] = useState({
    page: initialFilters.page || 1,
    limit: initialFilters.limit || 12,
    total: 0,
    totalPages: 0,
  })
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.status || 'all')
  const [priorityFilter, setPriorityFilter] = useState<string>(initialFilters.priority || 'all')
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  
  const [isFetching, setIsFetching] = useState(false)

  // Function to trigger search manually (on Enter or button click)
  const triggerSearch = () => {
    setDebouncedSearch(searchQuery)
    setPagination((prev) => ({ ...prev, page: 1 }))
    if (onFiltersChange) {
      onFiltersChange({ search: searchQuery, status: statusFilter !== 'all' ? statusFilter : undefined, priority: priorityFilter !== 'all' ? priorityFilter : undefined })
    }
  }

  // Handle Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      triggerSearch()
    }
  }

  const fetchTickets = useCallback(async () => {
    setIsFetching(true)
    try {
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const response = await fetch(`/api/tickets?${params.toString()}`)
      if (response.ok) {
        const data: PaginatedTicketsResponse = await response.json()
        setTickets(data.tickets)
        setPagination((prev) => ({
          ...prev,
          total: data.total,
          totalPages: data.totalPages,
        }))
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setIsFetching(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, priorityFilter])

  // Fetch tickets when filters or pagination change
  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Refresh tickets when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchTickets()
    }
  }, [refreshTrigger, fetchTickets])

  const handleSearchChange = (value: string) => {
    // Only update the search query state, don't trigger search automatically
    setSearchQuery(value)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
    if (onFiltersChange) {
      onFiltersChange({ search: debouncedSearch || undefined, status: value !== 'all' ? value : undefined, priority: priorityFilter !== 'all' ? priorityFilter : undefined })
    }
  }

  const handlePriorityFilterChange = (value: string) => {
    setPriorityFilter(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
    if (onFiltersChange) {
      onFiltersChange({ search: debouncedSearch || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, priority: value !== 'all' ? value : undefined })
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
    if (onPaginationChange) {
      onPaginationChange(newPage, pagination.limit)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }))
    if (onPaginationChange) {
      onPaginationChange(1, newLimit)
    }
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
    }
    await fetchTickets()
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
              <option value="pending">{t.tickets.status?.pending || 'Pending'}</option>
              <option value="in_progress">{t.tickets.status?.in_progress || 'In Progress'}</option>
              <option value="waiting_parts">{t.tickets.status?.waiting_parts || 'Waiting Parts'}</option>
              <option value="completed">{t.tickets.status?.completed || 'Completed'}</option>
              <option value="cancelled">{t.tickets.status?.cancelled || 'Cancelled'}</option>
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
              <option value="low">{t.tickets.priority?.low || 'Low'}</option>
              <option value="medium">{t.tickets.priority?.medium || 'Medium'}</option>
              <option value="high">{t.tickets.priority?.high || 'High'}</option>
              <option value="urgent">{t.tickets.priority?.urgent || 'Urgent'}</option>
            </select>
          </div>
        </div>

        <div className="ticket-list__view-controls">
          <div className="ticket-list__items-per-page ticket-list__filter-group">
            <label htmlFor="items-per-page">Items per page:</label>
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
              .replace('{count}', tickets.length.toString())
              .replace('{total}', pagination.total.toString())
          : `Showing ${tickets.length} of ${pagination.total} tickets`}
      </div>

      {isLoading || isFetching ? (
        <div className="ticket-list__loading spinner-container spinner-container--inline">
          <Spinner size="large" />
          <p>Loading tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="ticket-list__empty">
          <p>{t.tickets?.noTicketsFound || 'No tickets found'}</p>
        </div>
      ) : (
        <>
          <TicketTable tickets={tickets} />

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

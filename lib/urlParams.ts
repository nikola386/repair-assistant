/**
 * Utility functions for managing URL search params for filters
 */

export interface TicketsFilters {
  page: number
  limit: number
  search: string
  status: string
  priority: string
}

export interface ClientsFilters {
  search: string
  page: number
  limit: number
}

export const defaultTicketsFilters: TicketsFilters = {
  page: 1,
  limit: 12,
  search: '',
  status: '',
  priority: '',
}

export const defaultClientsFilters: ClientsFilters = {
  search: '',
  page: 1,
  limit: 100,
}

// Utility to parse filters from URL search params
export const parseTicketsFiltersFromUrl = (searchParams: URLSearchParams): Partial<TicketsFilters> => {
  const filters: Partial<TicketsFilters> = {}
  
  const page = searchParams.get('page')
  if (page) {
    const pageNum = parseInt(page, 10)
    if (!isNaN(pageNum) && pageNum > 0) filters.page = pageNum
  }
  
  const limit = searchParams.get('limit')
  if (limit) {
    const limitNum = parseInt(limit, 10)
    if (!isNaN(limitNum) && limitNum > 0) filters.limit = limitNum
  }
  
  const search = searchParams.get('search')
  if (search) filters.search = search
  
  const status = searchParams.get('status')
  if (status) filters.status = status
  
  const priority = searchParams.get('priority')
  if (priority) filters.priority = priority
  
  return filters
}

// Utility to sync filters to URL search params
export const syncTicketsFiltersToUrl = (filters: TicketsFilters, pathname: string = '/tickets') => {
  if (typeof window === 'undefined') return
  
  const params = new URLSearchParams()
  
  if (filters.page > 1) params.set('page', filters.page.toString())
  if (filters.limit !== defaultTicketsFilters.limit) params.set('limit', filters.limit.toString())
  if (filters.search.trim()) params.set('search', filters.search.trim())
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  
  const newUrl = params.toString() 
    ? `${pathname}?${params.toString()}`
    : pathname
  
  window.history.replaceState({}, '', newUrl)
}

// Utility to parse filters from URL search params
export const parseClientsFiltersFromUrl = (searchParams: URLSearchParams): Partial<ClientsFilters> => {
  const filters: Partial<ClientsFilters> = {}
  
  const page = searchParams.get('page')
  if (page) {
    const pageNum = parseInt(page, 10)
    if (!isNaN(pageNum) && pageNum > 0) filters.page = pageNum
  }
  
  const limit = searchParams.get('limit')
  if (limit) {
    const limitNum = parseInt(limit, 10)
    if (!isNaN(limitNum) && limitNum > 0) filters.limit = limitNum
  }
  
  const search = searchParams.get('search')
  if (search) filters.search = search
  
  return filters
}

// Utility to sync filters to URL search params
export const syncClientsFiltersToUrl = (filters: ClientsFilters, pathname: string = '/clients') => {
  if (typeof window === 'undefined') return
  
  const params = new URLSearchParams()
  
  if (filters.page > 1) params.set('page', filters.page.toString())
  if (filters.limit !== defaultClientsFilters.limit) params.set('limit', filters.limit.toString())
  if (filters.search.trim()) params.set('search', filters.search.trim())
  
  const newUrl = params.toString() 
    ? `${pathname}?${params.toString()}`
    : pathname
  
  window.history.replaceState({}, '', newUrl)
}


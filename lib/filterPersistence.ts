/**
 * Utility functions for persisting filters and sorting state in sessionStorage
 */

const STORAGE_KEYS = {
  TICKETS_FILTERS: 'tickets_filters',
  TICKETS_SORTING: 'tickets_sorting',
  CLIENTS_FILTERS: 'clients_filters',
  WARRANTIES_SORTING: 'warranties_sorting',
}

interface TicketsFilters {
  page: number
  limit: number
  search: string
  status: string
  priority: string
}

interface TicketsSorting {
  id: string
  desc: boolean
}

interface ClientsFilters {
  search: string
  page: number
  limit: number
}

export const filterPersistence = {
  saveTicketsFilters: (filters: TicketsFilters) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEYS.TICKETS_FILTERS, JSON.stringify(filters))
      } catch (error) {
        console.error('Error saving tickets filters:', error)
      }
    }
  },
  
  loadTicketsFilters: (): TicketsFilters | null => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEYS.TICKETS_FILTERS)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error loading tickets filters:', error)
      }
    }
    return null
  },
  
  clearTicketsFilters: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEYS.TICKETS_FILTERS)
      } catch (error) {
        console.error('Error clearing tickets filters:', error)
      }
    }
  },
  
  saveTicketsSorting: (sorting: TicketsSorting[]) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEYS.TICKETS_SORTING, JSON.stringify(sorting))
      } catch (error) {
        console.error('Error saving tickets sorting:', error)
      }
    }
  },
  
  loadTicketsSorting: (): TicketsSorting[] | null => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEYS.TICKETS_SORTING)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error loading tickets sorting:', error)
      }
    }
    return null
  },
  
  saveClientsFilters: (filters: ClientsFilters) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEYS.CLIENTS_FILTERS, JSON.stringify(filters))
      } catch (error) {
        console.error('Error saving clients filters:', error)
      }
    }
  },
  
  loadClientsFilters: (): ClientsFilters | null => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEYS.CLIENTS_FILTERS)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error loading clients filters:', error)
      }
    }
    return null
  },
  
  clearClientsFilters: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEYS.CLIENTS_FILTERS)
      } catch (error) {
        console.error('Error clearing clients filters:', error)
      }
    }
  },
  
  saveWarrantiesSorting: (sorting: TicketsSorting[]) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEYS.WARRANTIES_SORTING, JSON.stringify(sorting))
      } catch (error) {
        console.error('Error saving warranties sorting:', error)
      }
    }
  },
  
  loadWarrantiesSorting: (): TicketsSorting[] | null => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEYS.WARRANTIES_SORTING)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error loading warranties sorting:', error)
      }
    }
    return null
  },
}


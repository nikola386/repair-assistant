import { filterPersistence } from '@/lib/filterPersistence'

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
})

describe('filterPersistence', () => {
  beforeEach(() => {
    mockSessionStorage.clear()
    jest.clearAllMocks()
  })

  describe('tickets filters', () => {
    it('should save and load tickets filters', () => {
      const filters = {
        page: 1,
        limit: 10,
        search: 'test',
        status: 'pending',
        priority: 'high',
      }

      filterPersistence.saveTicketsFilters(filters)
      const loaded = filterPersistence.loadTicketsFilters()

      expect(loaded).toEqual(filters)
      expect(mockSessionStorage.setItem).toHaveBeenCalled()
    })

    it('should return null when no filters are saved', () => {
      const loaded = filterPersistence.loadTicketsFilters()
      expect(loaded).toBeNull()
    })

    it('should clear tickets filters', () => {
      const filters = { page: 1, limit: 10, search: '', status: '', priority: '' }
      filterPersistence.saveTicketsFilters(filters)
      filterPersistence.clearTicketsFilters()

      const loaded = filterPersistence.loadTicketsFilters()
      expect(loaded).toBeNull()
      expect(mockSessionStorage.removeItem).toHaveBeenCalled()
    })
  })

  describe('tickets sorting', () => {
    it('should save and load tickets sorting', () => {
      const sorting = [
        { id: 'createdAt', desc: true },
        { id: 'priority', desc: false },
      ]

      filterPersistence.saveTicketsSorting(sorting)
      const loaded = filterPersistence.loadTicketsSorting()

      expect(loaded).toEqual(sorting)
    })
  })

  describe('clients filters', () => {
    it('should save and load clients filters', () => {
      const filters = {
        search: 'john',
        page: 1,
        limit: 20,
      }

      filterPersistence.saveClientsFilters(filters)
      const loaded = filterPersistence.loadClientsFilters()

      expect(loaded).toEqual(filters)
    })

    it('should clear clients filters', () => {
      const filters = { search: 'test', page: 1, limit: 20 }
      filterPersistence.saveClientsFilters(filters)
      filterPersistence.clearClientsFilters()

      const loaded = filterPersistence.loadClientsFilters()
      expect(loaded).toBeNull()
    })
  })

  describe('warranties sorting', () => {
    it('should save and load warranties sorting', () => {
      const sorting = [{ id: 'expiryDate', desc: false }]

      filterPersistence.saveWarrantiesSorting(sorting)
      const loaded = filterPersistence.loadWarrantiesSorting()

      expect(loaded).toEqual(sorting)
    })
  })
})


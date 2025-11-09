import {
  parseTicketsFiltersFromUrl,
  syncTicketsFiltersToUrl,
  parseClientsFiltersFromUrl,
  syncClientsFiltersToUrl,
  defaultTicketsFilters,
  defaultClientsFilters,
} from '@/lib/urlParams'

// Mock window.history
const mockReplaceState = jest.fn()
Object.defineProperty(window, 'history', {
  value: {
    replaceState: mockReplaceState,
  },
  writable: true,
})

describe('urlParams', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('parseTicketsFiltersFromUrl', () => {
    it('should parse all filter parameters', () => {
      const params = new URLSearchParams({
        page: '2',
        limit: '20',
        search: 'test',
        status: 'pending',
        priority: 'high',
      })

      const filters = parseTicketsFiltersFromUrl(params)

      expect(filters.page).toBe(2)
      expect(filters.limit).toBe(20)
      expect(filters.search).toBe('test')
      expect(filters.status).toBe('pending')
      expect(filters.priority).toBe('high')
    })

    it('should ignore invalid page numbers', () => {
      const params = new URLSearchParams({
        page: 'invalid',
        limit: '-5',
      })

      const filters = parseTicketsFiltersFromUrl(params)

      expect(filters.page).toBeUndefined()
      expect(filters.limit).toBeUndefined()
    })

    it('should return empty object when no params', () => {
      const params = new URLSearchParams()
      const filters = parseTicketsFiltersFromUrl(params)

      expect(Object.keys(filters)).toHaveLength(0)
    })
  })

  describe('syncTicketsFiltersToUrl', () => {
    it('should update URL with filter params', () => {
      const filters = {
        page: 2,
        limit: 20,
        search: 'test',
        status: 'pending',
        priority: 'high',
      }

      syncTicketsFiltersToUrl(filters)

      expect(mockReplaceState).toHaveBeenCalled()
      const callArgs = mockReplaceState.mock.calls[0]
      expect(callArgs[2]).toContain('page=2')
      expect(callArgs[2]).toContain('search=test')
    })

    it('should not include default values in URL', () => {
      syncTicketsFiltersToUrl(defaultTicketsFilters)

      const callArgs = mockReplaceState.mock.calls[0]
      expect(callArgs[2]).not.toContain('page=1')
      expect(callArgs[2]).not.toContain('limit=12')
    })

    it('should not update URL when filters are default', () => {
      syncTicketsFiltersToUrl(defaultTicketsFilters)

      const callArgs = mockReplaceState.mock.calls[0]
      expect(callArgs[2]).toBe('/tickets')
    })
  })

  describe('parseClientsFiltersFromUrl', () => {
    it('should parse client filter parameters', () => {
      const params = new URLSearchParams({
        page: '3',
        limit: '30',
        search: 'john',
      })

      const filters = parseClientsFiltersFromUrl(params)

      expect(filters.page).toBe(3)
      expect(filters.limit).toBe(30)
      expect(filters.search).toBe('john')
    })
  })

  describe('syncClientsFiltersToUrl', () => {
    it('should update URL with client filter params', () => {
      const filters = {
        page: 2,
        limit: 30,
        search: 'test',
      }

      syncClientsFiltersToUrl(filters)

      expect(mockReplaceState).toHaveBeenCalled()
      const callArgs = mockReplaceState.mock.calls[0]
      expect(callArgs[2]).toContain('page=2')
      expect(callArgs[2]).toContain('search=test')
    })
  })
})


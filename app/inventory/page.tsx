'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import MultiSelect from '@/components/ui/MultiSelect'
import InventoryTable from '@/components/inventory/InventoryTable'
import InventoryForm from '@/components/inventory/InventoryForm'
import { InventoryItem, CreateInventoryItemInput, UpdateInventoryItemInput } from '@/types/inventory'
import { showAlert } from '@/lib/alerts'

function InventoryPageContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [addAnother, setAddAnother] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  
  // Convert comma-separated string to array for multi-select
  const parseFilterArray = (value: string | undefined): string[] => {
    if (!value) return []
    return value.split(',').map(v => v.trim()).filter(Boolean)
  }

  // Initialize filters from URL params
  const getFiltersFromUrl = () => {
    return {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '', // Can be comma-separated
      location: searchParams.get('location') || '', // Can be comma-separated
      lowStock: searchParams.get('lowStock') === 'true',
    }
  }
  
  const [filters, setFilters] = useState(getFiltersFromUrl)
  // Local state for UI (arrays for multi-select)
  const [categoryFilter, setCategoryFilter] = useState<string[]>(parseFilterArray(filters.category))
  const [locationFilter, setLocationFilter] = useState<string[]>(parseFilterArray(filters.location))
  
  // Sync filters when URL changes
  useEffect(() => {
    const urlFilters = {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      location: searchParams.get('location') || '',
      lowStock: searchParams.get('lowStock') === 'true',
    }
    setFilters(urlFilters)
    setCategoryFilter(parseFilterArray(urlFilters.category))
    setLocationFilter(parseFilterArray(urlFilters.location))
  }, [searchParams])

  // Fetch inventory items
  const fetchItems = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      if (filters.search.trim()) params.append('search', filters.search.trim())
      const categoryValue = categoryFilter.length > 0 ? categoryFilter.join(',') : ''
      const locationValue = locationFilter.length > 0 ? locationFilter.join(',') : ''
      if (categoryValue) params.append('category', categoryValue)
      if (locationValue) params.append('location', locationValue)
      if (filters.lowStock) params.append('lowStock', 'true')

      const response = await fetch(`/api/inventory?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
        })
      } else {
        throw new Error(t.inventory.page.fetchError)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
      setError(error instanceof Error ? error.message : t.inventory.page.fetchError)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch categories and locations for filter dropdowns
  const fetchFilters = async () => {
    try {
      const response = await fetch('/api/inventory')
      if (response.ok) {
        const data = await response.json()
        // Extract unique categories and locations from items
        const uniqueCategories = Array.from(
          new Set(data.items.map((item: InventoryItem) => item.category).filter(Boolean))
        ).sort() as string[]
        const uniqueLocations = Array.from(
          new Set(data.items.map((item: InventoryItem) => item.location).filter(Boolean))
        ).sort() as string[]
        setCategories(uniqueCategories)
        setLocations(uniqueLocations)
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [pagination.page, filters])

  useEffect(() => {
    if (items.length > 0) {
      fetchFilters()
    }
  }, [items.length])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false)
        setAddAnother(false)
      }
    }

    if (showForm) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [showForm])

  const handleCreateItem = async (data: CreateInventoryItemInput | UpdateInventoryItemInput) => {
    // Ensure name is present for create operation
    if (!data.name) {
      showAlert.error(t.inventory.form.nameRequired)
      return
    }
    
    // Type assertion: when creating, name is required
    const createData = data as CreateInventoryItemInput
    
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      })

      if (response.ok) {
        showAlert.success(t.inventory.page.createSuccess)
        // Only close modal if "add another" is not checked
        if (!addAnother) {
          setShowForm(false)
        }
        await fetchItems()
        await fetchFilters()
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.inventory.page.createError)
        throw new Error(error.error || t.inventory.page.createError)
      }
    } catch (error) {
      console.error('Error creating item:', error)
      throw error
    }
  }

  const handleItemUpdate = async (item: InventoryItem) => {
    await fetchItems()
    await fetchFilters()
  }

  const handleItemDelete = async (itemId: string) => {
    await fetchItems()
    await fetchFilters()
  }

  const handleQuantityAdjust = async (itemId: string, quantityChange: number) => {
    await fetchItems()
  }

  // Sync filters to URL
  const syncFiltersToUrl = useCallback((newFilters: typeof filters, newPagination = pagination, newCategoryFilter = categoryFilter, newLocationFilter = locationFilter) => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams()
    
    if (newFilters.search.trim()) params.set('search', newFilters.search.trim())
    const categoryValue = newCategoryFilter.length > 0 ? newCategoryFilter.join(',') : ''
    const locationValue = newLocationFilter.length > 0 ? newLocationFilter.join(',') : ''
    if (categoryValue) params.set('category', categoryValue)
    if (locationValue) params.set('location', locationValue)
    if (newFilters.lowStock) params.set('lowStock', 'true')
    if (newPagination.page > 1) params.set('page', newPagination.page.toString())
    if (newPagination.limit !== 50) params.set('limit', newPagination.limit.toString())
    
    const newUrl = params.toString() 
      ? `${pathname}?${params.toString()}`
      : pathname
    
    window.history.replaceState({}, '', newUrl)
  }, [pagination, pathname, categoryFilter, locationFilter])

  const handleSearch = () => {
    const newPagination = { ...pagination, page: 1 }
    setPagination(newPagination)
    syncFiltersToUrl(filters, newPagination, categoryFilter, locationFilter)
    fetchItems()
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <>
      <Navigation />
      <main className="inventory-page">
        <div className="container">
          <div className="inventory-page__header">
            <h1>{t.inventory?.title || 'Inventory'}</h1>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowForm(true)
                setAddAnother(false)
              }}
            >
              {t.inventory?.addItem || 'Add Item'}
            </button>
          </div>

          <div className="inventory-page__content">
            <div className="inventory-page__filters">
              <div className="inventory-page__search">
                <input
                  type="text"
                  placeholder={t.inventory?.searchPlaceholder || 'Search items...'}
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
                <label htmlFor="category-filter">{t.common.fields.category}:</label>
                <MultiSelect
                  id="category-filter"
                  options={categories.map(cat => ({ value: cat, label: cat }))}
                  selectedValues={categoryFilter}
                  onChange={(values) => {
                    setCategoryFilter(values)
                    const categoryValue = values.length > 0 ? values.join(',') : ''
                    const newFilters = { ...filters, category: categoryValue }
                    setFilters(newFilters)
                    const newPagination = { ...pagination, page: 1 }
                    setPagination(newPagination)
                    syncFiltersToUrl(newFilters, newPagination, values, locationFilter)
                  }}
                  placeholder={t.inventory.page.allCategories}
                  allLabel={t.inventory.page.allCategories}
                />
              </div>

              <div className="inventory-page__filter-group">
                <label htmlFor="location-filter">{t.common.fields.location}:</label>
                <MultiSelect
                  id="location-filter"
                  options={locations.map(loc => ({ value: loc, label: loc }))}
                  selectedValues={locationFilter}
                  onChange={(values) => {
                    setLocationFilter(values)
                    const locationValue = values.length > 0 ? values.join(',') : ''
                    const newFilters = { ...filters, location: locationValue }
                    setFilters(newFilters)
                    const newPagination = { ...pagination, page: 1 }
                    setPagination(newPagination)
                    syncFiltersToUrl(newFilters, newPagination, categoryFilter, values)
                  }}
                  placeholder={t.inventory.page.allLocations}
                  allLabel={t.inventory.page.allLocations}
                />
              </div>

              <label className="inventory-page__checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) => {
                    setFilters({ ...filters, lowStock: e.target.checked })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="inventory-page__checkbox"
                />
                {t.inventory?.lowStockOnly || 'Low Stock Only'}
              </label>
            </div>

            {isLoading ? (
              <div className="inventory-page__loading">
                <Spinner size="large" />
                <p>{t.auth?.loading || 'Loading...'}</p>
              </div>
            ) : error ? (
              <div className="inventory-page__error">
                <p>{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="inventory-page__empty">
                <p>{t.inventory?.noItems || 'No inventory items found'}</p>
              </div>
            ) : (
              <>
                <InventoryTable
                  items={items}
                  onItemUpdate={handleItemUpdate}
                  onItemDelete={handleItemDelete}
                  onQuantityAdjust={handleQuantityAdjust}
                  editable={true}
                  isLoading={isLoading}
                />
                {pagination.totalPages > 1 && (
                  <div className="inventory-page__pagination">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                    >
                      {t.common.actions.previous}
                    </button>
                    <span>
                      {t.inventory.page.pageInfo.replace('{page}', pagination.page.toString()).replace('{totalPages}', pagination.totalPages.toString()).replace('{total}', pagination.total.toString())}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      {t.common.actions.next}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add Item Modal */}
      {showForm && (
        <div 
          className="inventory-modal" 
          onClick={() => {
            setShowForm(false)
            setAddAnother(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-item-modal-title"
        >
          <div className="inventory-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal__header">
              <h2 id="add-item-modal-title" className="inventory-modal__title">{t.inventory?.addItem || 'Add Item'}</h2>
              <button
                className="inventory-modal__close"
                onClick={() => {
                  setShowForm(false)
                  setAddAnother(false)
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="inventory-modal__body">
              <InventoryForm
                onSubmit={handleCreateItem}
                onCancel={() => {
                  setShowForm(false)
                  setAddAnother(false)
                }}
                addAnother={addAnother}
                onAddAnotherChange={setAddAnother}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <>
        <Navigation />
        <main className="inventory-page">
          <div className="inventory-page__container">
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Spinner />
            </div>
          </div>
        </main>
      </>
    }>
      <InventoryPageContent />
    </Suspense>
  )
}


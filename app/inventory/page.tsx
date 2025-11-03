'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import InventoryTable from '@/components/inventory/InventoryTable'
import InventoryForm from '@/components/inventory/InventoryForm'
import { InventoryItem, CreateInventoryItemInput } from '@/types/inventory'
import { showAlert } from '@/lib/alerts'

export default function InventoryPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
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
  const [categories, setCategories] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  
  // Initialize filters from URL params
  const getFiltersFromUrl = () => {
    return {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      location: searchParams.get('location') || '',
      lowStock: searchParams.get('lowStock') === 'true',
    }
  }
  
  const [filters, setFilters] = useState(getFiltersFromUrl)
  
  // Sync filters when URL changes
  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      location: searchParams.get('location') || '',
      lowStock: searchParams.get('lowStock') === 'true',
    })
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
      if (filters.category) params.append('category', filters.category)
      if (filters.location) params.append('location', filters.location)
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

  const handleCreateItem = async (data: CreateInventoryItemInput) => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        showAlert.success(t.inventory.page.createSuccess)
        setShowForm(false)
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

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 })
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
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? t.inventory.page.cancel : t.inventory?.addItem || 'Add Item'}
            </button>
          </div>

          {showForm && (
            <div className="inventory-page__form">
               <InventoryForm
                onSubmit={handleCreateItem}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

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

              <select
                value={filters.category}
                onChange={(e) => {
                  setFilters({ ...filters, category: e.target.value })
                  setPagination({ ...pagination, page: 1 })
                }}
                className="inventory-page__filter"
              >
                <option value="">{t.inventory.page.allCategories}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={filters.location}
                onChange={(e) => {
                  setFilters({ ...filters, location: e.target.value })
                  setPagination({ ...pagination, page: 1 })
                }}
                className="inventory-page__filter"
              >
                <option value="">{t.inventory.page.allLocations}</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

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
    </>
  )
}


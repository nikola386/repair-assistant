'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from './currency'

/**
 * Hook to get and use store currency for formatting
 * Fetches currency from /api/settings and provides formatting functions
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<string>('USD')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setCurrency(data.store?.currency || 'USD')
        }
      } catch (error) {
        console.error('Error fetching currency:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrency()
  }, [])

  const formatCurrencyFn = useCallback(
    (amount: number | undefined | null) => formatCurrency(amount, currency),
    [currency]
  )

  const formatCurrencyCompactFn = useCallback(
    (value: number) => formatCurrencyCompact(value, currency),
    [currency]
  )

  const getCurrencySymbolFn = useCallback(
    () => getCurrencySymbol(currency),
    [currency]
  )

  return {
    currency,
    loading,
    formatCurrency: formatCurrencyFn,
    formatCurrencyCompact: formatCurrencyCompactFn,
    getCurrencySymbol: getCurrencySymbolFn,
  }
}


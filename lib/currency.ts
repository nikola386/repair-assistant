/**
 * Currency formatting utilities
 */

/**
 * Format a number as currency based on the currency code
 * @param amount - The amount to format
 * @param currencyCode - The currency code (e.g., 'USD', 'EUR', 'GBP')
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | undefined | null,
  currencyCode: string = 'USD',
  locale?: string
): string {
  if (amount === undefined || amount === null || isNaN(amount) || !isFinite(amount)) {
    return '—'
  }

  // Determine locale based on currency if not provided
  let formatLocale = locale
  if (!formatLocale) {
    // Map common currencies to their locales
    const currencyLocaleMap: Record<string, string> = {
      USD: 'en-US',
      EUR: 'de-DE', // European format
      GBP: 'en-GB',
      BGN: 'bg-BG',
      CAD: 'en-CA',
      AUD: 'en-AU',
    }
    formatLocale = currencyLocaleMap[currencyCode] || 'en-US'
  }

  try {
    return new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback to simple formatting if Intl.NumberFormat fails
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

/**
 * Format currency for chart tick labels (compact format)
 * @param value - The value to format
 * @param currencyCode - The currency code
 * @returns Formatted string (e.g., "$1.5k" or "€2.3k")
 */
export function formatCurrencyCompact(
  value: number,
  currencyCode: string = 'USD'
): string {
  if (value >= 1000) {
    const compactValue = (value / 1000).toFixed(1)
    // Get the currency symbol
    const symbol = getCurrencySymbol(currencyCode)
    // Format the compact value and add 'k' suffix
    return `${symbol}${compactValue}k`
  }
  // For values less than 1000, just format normally
  return formatCurrency(value, currencyCode)
}

/**
 * Get currency symbol for a given currency code
 * @param currencyCode - The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    // Extract symbol from formatted string
    const parts = formatter.formatToParts(0)
    const symbolPart = parts.find(part => part.type === 'currency')
    return symbolPart?.value || currencyCode
  } catch (error) {
    // Fallback to currency code if formatting fails
    return currencyCode
  }
}


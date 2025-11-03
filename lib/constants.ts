/**
 * Default color constants used throughout the application
 */
export const DEFAULT_PRIMARY_COLOR = '#FFD700'
export const DEFAULT_SECONDARY_COLOR = '#000000'

/**
 * File size constants (in bytes)
 */
export const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * Currency options
 */
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
] as const


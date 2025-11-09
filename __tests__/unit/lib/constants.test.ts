import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  MAX_FILE_SIZE,
  CURRENCIES,
} from '@/lib/constants'

describe('constants', () => {
  it('should export default primary color', () => {
    expect(DEFAULT_PRIMARY_COLOR).toBe('#FFD700')
  })

  it('should export default secondary color', () => {
    expect(DEFAULT_SECONDARY_COLOR).toBe('#000000')
  })

  it('should export max file size constant', () => {
    expect(MAX_FILE_SIZE).toBe(2 * 1024 * 1024) // 2MB
  })

  it('should export currencies array', () => {
    expect(Array.isArray(CURRENCIES)).toBe(true)
    expect(CURRENCIES.length).toBeGreaterThan(0)
  })

  it('should have currency objects with code and name', () => {
    CURRENCIES.forEach((currency) => {
      expect(currency).toHaveProperty('code')
      expect(currency).toHaveProperty('name')
      expect(typeof currency.code).toBe('string')
      expect(typeof currency.name).toBe('string')
    })
  })

  it('should include common currencies', () => {
    const codes = CURRENCIES.map((c) => c.code)
    expect(codes).toContain('USD')
    expect(codes).toContain('EUR')
    expect(codes).toContain('GBP')
  })
})


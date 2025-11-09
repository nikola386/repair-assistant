import { isValidHexColor, validateHexColor } from '@/lib/colorValidation'

describe('colorValidation', () => {
  describe('isValidHexColor', () => {
    it('should return true for valid 6-digit hex color', () => {
      expect(isValidHexColor('#FFD700')).toBe(true)
      expect(isValidHexColor('#000000')).toBe(true)
      expect(isValidHexColor('#FFFFFF')).toBe(true)
      expect(isValidHexColor('#aabbcc')).toBe(true)
    })

    it('should return true for valid 3-digit hex color', () => {
      expect(isValidHexColor('#FFF')).toBe(true)
      expect(isValidHexColor('#000')).toBe(true)
      expect(isValidHexColor('#abc')).toBe(true)
    })

    it('should return false for invalid hex colors', () => {
      expect(isValidHexColor('FFD700')).toBe(false) // Missing #
      expect(isValidHexColor('#GGGGGG')).toBe(false) // Invalid characters
      expect(isValidHexColor('#FF')).toBe(false) // Too short
      expect(isValidHexColor('#FFD70000')).toBe(false) // Too long
      expect(isValidHexColor('')).toBe(false) // Empty
      expect(isValidHexColor('red')).toBe(false) // Named color
    })
  })

  describe('validateHexColor', () => {
    it('should return null for valid hex color', () => {
      expect(validateHexColor('#FFD700')).toBeNull()
      expect(validateHexColor('#000')).toBeNull()
    })

    it('should return error message for invalid hex color', () => {
      const result = validateHexColor('invalid')
      expect(result).toContain('Invalid')
      expect(result).toContain('hex format')
    })

    it('should use custom field name in error message', () => {
      const result = validateHexColor('invalid', 'Primary color')
      expect(result).toContain('primary color')
    })
  })
})


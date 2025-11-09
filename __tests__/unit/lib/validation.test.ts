import { validatePassword, validatePasswordClient, passwordSchema } from '@/lib/validation'

describe('validation', () => {
  describe('validatePassword', () => {
    it('should return null for valid password', () => {
      const result = validatePassword('ValidPass123!')
      expect(result).toBeNull()
    })

    it('should return error for password shorter than 8 characters', () => {
      const result = validatePassword('Short1!')
      expect(result).toBe('Password must be at least 8 characters long')
    })

    it('should return error for password without uppercase letter', () => {
      const result = validatePassword('validpass123!')
      expect(result).toBe('Password must contain at least one uppercase letter')
    })

    it('should return error for password without lowercase letter', () => {
      const result = validatePassword('VALIDPASS123!')
      expect(result).toBe('Password must contain at least one lowercase letter')
    })

    it('should return error for password without number', () => {
      const result = validatePassword('ValidPass!')
      expect(result).toBe('Password must contain at least one number')
    })

    it('should return error for password without special character', () => {
      const result = validatePassword('ValidPass123')
      expect(result).toBe('Password must contain at least one special character')
    })
  })

  describe('validatePasswordClient', () => {
    it('should return valid: true for valid password', () => {
      const result = validatePasswordClient('ValidPass123!')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid: false with error message for invalid password', () => {
      const result = validatePasswordClient('short')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('passwordSchema', () => {
    it('should validate correct password', () => {
      const result = passwordSchema.safeParse('ValidPass123!')
      expect(result.success).toBe(true)
    })

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('validpass123!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase')
      }
    })

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('VALIDPASS123!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase')
      }
    })

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('ValidPass!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number')
      }
    })

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('ValidPass123')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('special character')
      }
    })
  })
})


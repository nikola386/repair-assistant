import {
  SUPPORTED_LANGUAGES,
  isValidLanguage,
  getLanguageMetadata,
  getAllLanguages,
  LANGUAGE_METADATA,
} from '@/lib/languages'

describe('languages', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('should contain expected languages', () => {
      expect(SUPPORTED_LANGUAGES).toContain('en')
      expect(SUPPORTED_LANGUAGES).toContain('bg')
      expect(SUPPORTED_LANGUAGES).toContain('de')
    })
  })

  describe('isValidLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isValidLanguage('en')).toBe(true)
      expect(isValidLanguage('bg')).toBe(true)
      expect(isValidLanguage('de')).toBe(true)
    })

    it('should return false for unsupported languages', () => {
      expect(isValidLanguage('fr')).toBe(false)
      expect(isValidLanguage('es')).toBe(false)
      expect(isValidLanguage('invalid')).toBe(false)
      expect(isValidLanguage('')).toBe(false)
    })
  })

  describe('getLanguageMetadata', () => {
    it('should return metadata for valid language', () => {
      const metadata = getLanguageMetadata('en')
      expect(metadata.code).toBe('en')
      expect(metadata.name).toBe('English')
      expect(metadata.nativeName).toBe('English')
    })

    it('should return metadata for Bulgarian', () => {
      const metadata = getLanguageMetadata('bg')
      expect(metadata.code).toBe('bg')
      expect(metadata.name).toBe('Bulgarian')
      expect(metadata.nativeName).toBe('Български')
    })

    it('should return metadata for German', () => {
      const metadata = getLanguageMetadata('de')
      expect(metadata.code).toBe('de')
      expect(metadata.name).toBe('German')
      expect(metadata.nativeName).toBe('Deutsch')
    })
  })

  describe('getAllLanguages', () => {
    it('should return all language metadata', () => {
      const languages = getAllLanguages()
      expect(languages).toHaveLength(SUPPORTED_LANGUAGES.length)
      expect(languages.every(lang => lang.code && lang.name && lang.nativeName)).toBe(true)
    })

    it('should include all supported languages', () => {
      const languages = getAllLanguages()
      const codes = languages.map(lang => lang.code)
      SUPPORTED_LANGUAGES.forEach(code => {
        expect(codes).toContain(code)
      })
    })
  })

  describe('LANGUAGE_METADATA', () => {
    it('should have metadata for all supported languages', () => {
      SUPPORTED_LANGUAGES.forEach(code => {
        expect(LANGUAGE_METADATA[code]).toBeDefined()
        expect(LANGUAGE_METADATA[code].code).toBe(code)
        expect(LANGUAGE_METADATA[code].name).toBeDefined()
        expect(LANGUAGE_METADATA[code].nativeName).toBeDefined()
      })
    })
  })
})


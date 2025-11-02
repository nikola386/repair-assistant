// Supported languages configuration
// To add a new language:
// 1. Create a locale file in locales/ (e.g., locales/fr.json)
// 2. Add the language code to SUPPORTED_LANGUAGES array
// 3. Add language metadata to LANGUAGE_METADATA
// 4. Import the locale file in contexts/LanguageContext.tsx

export const SUPPORTED_LANGUAGES = ['en', 'bg', 'de'] as const

export type Language = typeof SUPPORTED_LANGUAGES[number]

export interface LanguageMetadata {
  code: Language
  name: string
  nativeName: string
}

export const LANGUAGE_METADATA: Record<Language, LanguageMetadata> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
  },
  bg: {
    code: 'bg',
    name: 'Bulgarian',
    nativeName: 'Български',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
  },
}

export function isValidLanguage(lang: string): lang is Language {
  return SUPPORTED_LANGUAGES.includes(lang as Language)
}

export function getLanguageMetadata(lang: Language): LanguageMetadata {
  return LANGUAGE_METADATA[lang]
}

export function getAllLanguages(): LanguageMetadata[] {
  return SUPPORTED_LANGUAGES.map(code => LANGUAGE_METADATA[code])
}


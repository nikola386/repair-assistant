'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import en from '../locales/en.json'
import bg from '../locales/bg.json'

type Language = 'en' | 'bg'
type Translations = typeof en

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getBrowserLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en' // Default for SSR
  }

  const browserLang = navigator.language || (navigator as any).userLanguage
  
  // Check if browser language starts with 'bg' (Bulgarian)
  if (browserLang.toLowerCase().startsWith('bg')) {
    return 'bg'
  }
  
  // Default to English
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    // Check localStorage first (user preference)
    const savedLanguage = localStorage.getItem('language') as Language | null
    
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'bg')) {
      // User has explicitly set a preference
      setLanguage(savedLanguage)
    } else {
      // If no saved preference, use browser locale
      const browserLang = getBrowserLanguage()
      setLanguage(browserLang)
      localStorage.setItem('language', browserLang)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  const translations: Translations = language === 'bg' ? bg : en

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t: translations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}


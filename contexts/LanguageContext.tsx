'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { Language, SUPPORTED_LANGUAGES, isValidLanguage } from '@/lib/languages'
import en from '../locales/en.json'
import bg from '../locales/bg.json'
import de from '../locales/de.json'

type Translations = typeof en

// Re-export Language type for convenience
export type { Language }

// Translation map - add new languages here by importing the locale file and adding to this object
const translationsMap: Record<Language, Translations> = {
  en,
  bg,
  de,
}

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
  const langCode = browserLang.toLowerCase().split('-')[0]
  
  // Check if browser language is supported
  if (isValidLanguage(langCode)) {
    return langCode
  }
  
  // Default to English
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const { data: session, status } = useSession()
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    // First, check localStorage for immediate language setting
    const savedLanguage = localStorage.getItem('language')
    
    if (savedLanguage && isValidLanguage(savedLanguage)) {
      setLanguage(savedLanguage)
      setLoadingSettings(false)
    } else {
      // If no saved preference, use browser locale
      const browserLang = getBrowserLanguage()
      setLanguage(browserLang)
      localStorage.setItem('language', browserLang)
      setLoadingSettings(false)
    }

    // If authenticated, fetch language from settings
    if (status === 'authenticated' && session) {
      fetch('/api/settings')
        .then((res) => {
          if (res.ok) {
            return res.json()
          }
          return null
        })
        .then((data) => {
          if (data?.settings?.language && isValidLanguage(data.settings.language)) {
            const settingsLanguage = data.settings.language as Language
            setLanguage(settingsLanguage)
            localStorage.setItem('language', settingsLanguage)
          }
        })
        .catch((err) => {
          console.error('Error fetching language from settings:', err)
          // Fall back to localStorage
        })
        .finally(() => {
          setLoadingSettings(false)
        })
    }
  }, [session, status])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
    
    // If authenticated, also save to settings
    if (status === 'authenticated' && session) {
      fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: lang }),
      }).catch((err) => {
        console.error('Error saving language to settings:', err)
      })
    }
  }

  const translations: Translations = translationsMap[language] || translationsMap.en

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


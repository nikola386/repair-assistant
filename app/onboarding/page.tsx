'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Language, getAllLanguages } from '@/lib/languages'
import Spinner from '@/components/ui/Spinner'
import Steps from '@/components/ui/Steps'
import LogoUpload from '@/components/ui/LogoUpload'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { showAlert } from '@/lib/alerts'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, CURRENCIES } from '@/lib/constants'

interface Country {
  id: string
  code: string
  name: string
  requiresVat: boolean
}

export default function OnboardingPage() {
  const { t, setLanguage } = useLanguage()
  const router = useRouter()
  const { data: session, status } = useSession()

  const [storeName, setStoreName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')

  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [vatNumber, setVatNumber] = useState('')

  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY_COLOR)
  const [language, setLocalLanguage] = useState<Language>('en')

  const [countries, setCountries] = useState<Country[]>([])

  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const selectedCountry = countries.find(c => c.code === country)
  const isEUCountry = selectedCountry?.requiresVat || false

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch('/api/countries')
      if (response.ok) {
        const data = await response.json()
        setCountries(data.countries || [])
      }
    } catch (err) {
      console.error('Error fetching countries:', err)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session) {
      fetchCountries()
      
      fetch('/api/onboarding')
        .then((res) => res.json())
        .then((data) => {
          if (data.isComplete) {
            router.push('/dashboard')
          } else {
            if (data.store) {
              setStoreName(data.store.name || '')
              setStreet(data.store.street || '')
              setCity(data.store.city || '')
              setState(data.store.state || '')
              setPostalCode(data.store.postalCode || '')
              const countryCode = data.store.country || ''
              setCountry(countryCode)
              setWebsite(data.store.website || '')
              setPhone(data.store.phone || '')
              setCurrency(data.store.currency || 'USD')
              setVatNumber(data.store.vatNumber || '')
              if (data.store.logo) {
                setLogoPreview(data.store.logo)
              }
              if (data.settings) {
                setPrimaryColor(data.settings.primaryColor || DEFAULT_PRIMARY_COLOR)
                setSecondaryColor(data.settings.secondaryColor || DEFAULT_SECONDARY_COLOR)
                setLocalLanguage((data.settings.language as Language) || 'en')
              }
            }
            setFetching(false)
          }
        })
        .catch((err) => {
          console.error('Error fetching onboarding status:', err)
          setFetching(false)
        })
    }
  }, [status, session, router, fetchCountries])


  const handleLogoChange = (file: File | null) => {
    setLogo(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setLogoPreview('')
    }
  }

  const handleRemoveLogo = () => {
    setLogo(null)
    setLogoPreview('')
  }

  const validateStep = (step: number): boolean => {
    setError('')
    
    if (step === 1) {
      if (!storeName.trim()) {
        const errorMsg = t.onboarding?.step1StoreNameRequired || 'Store name is required'
        setError(errorMsg)
        showAlert.error(errorMsg)
        return false
      }
    }
    
    if (step === 2) {
      if (isEUCountry && vatNumber && vatNumber.trim().length < 2) {
        const errorMsg = t.onboarding?.invalidVatNumber || 'Invalid VAT number'
        setError(errorMsg)
        showAlert.error(errorMsg)
        return false
      }
    }
    
    if (step === 3) {
    }
    
    return true
  }

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault()
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    if (!validateStep(currentStep)) {
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('storeName', storeName)
      if (street) formData.append('street', street)
      if (city) formData.append('city', city)
      if (state) formData.append('state', state)
      if (postalCode) formData.append('postalCode', postalCode)
      if (country) formData.append('country', country)
      if (website) formData.append('website', website)
      if (phone) formData.append('phone', phone)
      formData.append('currency', currency)
      if (vatNumber) formData.append('vatNumber', vatNumber)
      if (logo) formData.append('logo', logo)
      formData.append('primaryColor', primaryColor)
      formData.append('secondaryColor', secondaryColor)
      formData.append('language', language)

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || t.onboarding?.error || 'Failed to complete onboarding'
        setError(errorMsg)
        showAlert.error(errorMsg)
        setLoading(false)
        return
      }

      if (data.settings?.language) {
        setLanguage(data.settings.language as Language)
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const errorMsg = t.onboarding?.error || 'An error occurred during onboarding'
      setError(errorMsg)
      showAlert.error(errorMsg)
      setLoading(false)
    }
  }

  if (status === 'loading' || fetching) {
    return (
      <div className="login-page onboarding-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <Spinner size="small" />
              <p style={{ marginTop: '1rem', color: 'var(--gray-medium)' }}>
                {t.auth?.loading || 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const steps = [
    {
      number: 1,
      title: t.onboarding?.step1Title || 'Basic Information',
      description: t.onboarding?.step1Description || 'Store name and address'
    },
    {
      number: 2,
      title: t.onboarding?.step2Title || 'Store Details',
      description: t.onboarding?.step2Description || 'Contact and business info'
    },
    {
      number: 3,
      title: t.onboarding?.step3Title || 'Appearance',
      description: t.onboarding?.step3Description || 'Logo and colors'
    }
  ]

  return (
    <div className="login-page onboarding-page">
      <div className="login-tools">
        <div className="tool-icon-svg" style={{ '--delay': '0s', '--x': '10%', '--y': '15%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '0.7s', '--x': '85%', '--y': '25%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '1.2s', '--x': '15%', '--y': '60%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v20M2 12h20M6 6l12 12M18 6L6 18"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '0.3s', '--x': '75%', '--y': '70%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9h6v6H9z"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '1.5s', '--x': '50%', '--y': '20%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '0.9s', '--x': '25%', '--y': '40%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="8" width="18" height="12" rx="2"/>
            <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '1.8s', '--x': '90%', '--y': '55%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '0.5s', '--x': '60%', '--y': '80%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="tool-icon-svg" style={{ '--delay': '1.3s', '--x': '40%', '--y': '10%' } as React.CSSProperties}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6M1 12h6m6 0h6"/>
          </svg>
        </div>
      </div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">{t.onboarding?.title || 'Welcome! Let\'s Set Up Your Store'}</h1>
            <p className="login-subtitle">{t.onboarding?.description || 'Configure your store information to get started.'}</p>
          </div>

          <Steps steps={steps} currentStep={currentStep} />

          <form onSubmit={handleSubmit} className="login-form">
            {/* Step 1: Store name and address */}
            {currentStep === 1 && (
              <div className="onboarding-step">
                <div className="form-group">
                  <label htmlFor="storeName" className="form-label">
                    {t.onboarding?.storeName || 'Store Name'} *
                  </label>
                  <input
                    id="storeName"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="form-input"
                    required
                    disabled={loading}
                    placeholder={t.onboarding?.storeNamePlaceholder || 'Enter your store name'}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="street" className="form-label">
                    {t.onboarding?.street || 'Street Address'}
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="form-input"
                    disabled={loading}
                    placeholder={t.onboarding?.streetPlaceholder || 'Street address'}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">
                      {t.onboarding?.city || 'City'}
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="form-input"
                      disabled={loading}
                      placeholder={t.onboarding?.cityPlaceholder || 'City'}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="state" className="form-label">
                      {t.onboarding?.state || 'State/Province'}
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="form-input"
                      disabled={loading}
                      placeholder={t.onboarding?.statePlaceholder || 'State/Province'}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="postalCode" className="form-label">
                      {t.onboarding?.postalCode || 'Postal Code'}
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="form-input"
                      disabled={loading}
                      placeholder={t.onboarding?.postalCodePlaceholder || 'Postal Code'}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="country" className="form-label">
                      {t.onboarding?.country || 'Country'}
                    </label>
                    <SearchableSelect
                      id="country"
                      value={country}
                      onChange={(selectedCode) => {
                        const selectedCountry = countries.find(c => c.code === selectedCode)
                        setCountry(selectedCode)
                        if (!selectedCountry?.requiresVat) {
                          setVatNumber('')
                        }
                      }}
                      options={countries.map((c) => ({
                        value: c.code,
                        label: `${c.name}`
                      }))}
                      placeholder={t.onboarding?.countryPlaceholder || 'Select a country...'}
                      searchPlaceholder="Search countries..."
                      disabled={loading}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Additional store details */}
            {currentStep === 2 && (
              <div className="onboarding-step">
                <div className="form-group">
                  <label htmlFor="website" className="form-label">
                    {t.onboarding?.website || 'Website'}
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="form-input"
                    disabled={loading}
                    placeholder={t.onboarding?.websitePlaceholder || 'https://example.com'}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    {t.onboarding?.phone || 'Phone'}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    disabled={loading}
                    placeholder={t.onboarding?.phonePlaceholder || 'Enter phone number'}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="currency" className="form-label">
                    {t.onboarding?.currency || 'Currency'} *
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="form-input"
                    disabled={loading}
                    required
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name} ({curr.code})
                      </option>
                    ))}
                  </select>
                </div>

                {isEUCountry && (
                  <div className="form-group">
                    <label htmlFor="vatNumber" className="form-label">
                      {t.onboarding?.vatNumber || 'VAT Number'}
                    </label>
                    <input
                      id="vatNumber"
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      className="form-input"
                      disabled={loading || (!country && currentStep === 2)}
                      placeholder={t.onboarding?.vatNumberPlaceholder || 'VAT Number (optional)'}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Appearance */}
            {currentStep === 3 && (
              <div className="onboarding-step">
                <div className="form-group">
                  <LogoUpload
                    preview={logoPreview}
                    onChange={handleLogoChange}
                    onRemove={handleRemoveLogo}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="primaryColor" className="form-label">
                    {t.onboarding?.primaryColor || 'Primary Color'}
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="form-input"
                      style={{ width: '80px', height: '48px', padding: '4px', cursor: 'pointer' }}
                      disabled={loading}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="form-input"
                      placeholder="#FFD700"
                      disabled={loading}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="secondaryColor" className="form-label">
                    {t.onboarding?.secondaryColor || 'Secondary Color'}
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="form-input"
                      style={{ width: '80px', height: '48px', padding: '4px', cursor: 'pointer' }}
                      disabled={loading}
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="form-input"
                      placeholder="#000000"
                      disabled={loading}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="language" className="form-label">
                    {t.onboarding?.language || t.settings?.language || 'Language'}
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLocalLanguage(e.target.value as Language)}
                    className="form-input"
                    disabled={loading}
                  >
                    {getAllLanguages().map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="onboarding-actions">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleBack(e)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  {t.onboarding?.back || 'Back'}
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={(e) => handleNext(e)}
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ marginLeft: currentStep > 1 ? 'auto' : '0' }}
                >
                  {t.onboarding?.next || 'Next'}
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !storeName.trim()}
                  style={{ marginLeft: 'auto' }}
                >
                  {loading ? (
                    <>
                      <Spinner size="small" />
                      {t.onboarding?.completing || 'Completing setup...'}
                    </>
                  ) : (
                    t.onboarding?.complete || 'Complete Setup'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

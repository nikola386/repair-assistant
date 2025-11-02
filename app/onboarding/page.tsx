'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import Steps from '@/components/ui/Steps'

interface Country {
  id: string
  code: string
  name: string
  requiresVat: boolean
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
]

export default function OnboardingPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { data: session, status } = useSession()

  // Step 1: Store name and address
  const [storeName, setStoreName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')

  // Step 2: Additional details
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [vatNumber, setVatNumber] = useState('')

  // Step 3: Appearance
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState('#FFD700')
  const [secondaryColor, setSecondaryColor] = useState('#000000')

  // Country dropdown state
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
      
      // Check if onboarding is already complete
      fetch('/api/onboarding')
        .then((res) => res.json())
        .then((data) => {
          if (data.isComplete) {
            // Redirect to dashboard if onboarding is complete
            router.push('/dashboard')
          } else {
            // Pre-fill form with existing data if available
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
                setPrimaryColor(data.settings.primaryColor || '#FFD700')
                setSecondaryColor(data.settings.secondaryColor || '#000000')
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


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogo(null)
    setLogoPreview('')
    // Reset file input
    const fileInput = document.getElementById('logo') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const validateStep = (step: number): boolean => {
    setError('')
    
    if (step === 1) {
      if (!storeName.trim()) {
        setError(t.onboarding?.step1StoreNameRequired || 'Store name is required')
        return false
      }
    }
    
    if (step === 2) {
      // Step 2 has no required fields, but validate VAT if EU country
      if (isEUCountry && vatNumber && vatNumber.trim().length < 2) {
        setError(t.onboarding?.invalidVatNumber || 'Invalid VAT number')
        return false
      }
    }
    
    if (step === 3) {
      // Step 3 has no required fields
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

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t.onboarding?.error || 'Failed to complete onboarding')
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(t.onboarding?.error || 'An error occurred during onboarding')
      setLoading(false)
    }
  }

  // Show loading state while checking session or onboarding status
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

  // Don't show onboarding if not authenticated (will redirect)
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
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

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
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => {
                        const selectedCode = e.target.value
                        const selectedCountry = countries.find(c => c.code === selectedCode)
                        setCountry(selectedCode)
                        // Clear VAT number if country doesn't require VAT
                        if (!selectedCountry?.requiresVat) {
                          setVatNumber('')
                        }
                      }}
                      className="form-input"
                      disabled={loading}
                    >
                      <option value="">{t.onboarding?.countryPlaceholder || 'Select a country...'}</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.name} {c.requiresVat && '(VAT required)'}
                        </option>
                      ))}
                    </select>
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
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-medium)', marginLeft: '0.5rem' }}>
                        ({t.onboarding?.requiredForEU || 'Required for EU'})
                      </span>
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
                  <label htmlFor="logo" className="form-label">
                    {t.onboarding?.logo || 'Logo'}
                  </label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="form-input"
                    disabled={loading}
                  />
                  {logoPreview && (
                    <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block', width: 'fit-content' }}>
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          display: 'block',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={loading}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: '2px solid white',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          padding: 0,
                          lineHeight: 1,
                          zIndex: 10,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.currentTarget.style.backgroundColor = '#dc2626'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        aria-label={t.onboarding?.removeLogo || 'Remove logo'}
                      >
                        ×
                      </button>
                    </div>
                  )}
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { Language, getAllLanguages } from '@/lib/languages'
import LogoUpload from '@/components/ui/LogoUpload'
import { showAlert } from '@/lib/alerts'
import { validatePasswordClient } from '@/lib/validation'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, CURRENCIES } from '@/lib/constants'

import type { User } from '@/lib/userStorage'

interface Country {
  id: string
  code: string
  name: string
  requiresVat: boolean
}

type Tab = 'profile' | 'password' | 'store' | 'appearance'

export default function SettingsPage() {
  const { t, setLanguage } = useLanguage()
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const [profileFormData, setProfileFormData] = useState({
    name: '',
    email: '',
  })

  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [appearanceFormData, setAppearanceFormData] = useState({
    primaryColor: DEFAULT_PRIMARY_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
    language: 'en' as Language,
  })

  const [storeFormData, setStoreFormData] = useState({
    storeName: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    website: '',
    phone: '',
    currency: 'USD',
    vatNumber: '',
  })

  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [removeLogo, setRemoveLogo] = useState(false)
  const [countries, setCountries] = useState<Country[]>([])
  const [storeLoading, setStoreLoading] = useState(false)

  const [settingsLoading, setSettingsLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setProfileFormData({
          name: data.user.name || '',
          email: data.user.email || '',
        })
      } else {
        const errorMsg = t.profile?.fetchError || 'Failed to load profile'
        setError(errorMsg)
        showAlert.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = t.profile?.fetchError || 'Failed to load profile'
      setError(errorMsg)
      showAlert.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [t.profile?.fetchError])

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

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setAppearanceFormData({
            primaryColor: data.settings.primaryColor || DEFAULT_PRIMARY_COLOR,
            secondaryColor: data.settings.secondaryColor || DEFAULT_SECONDARY_COLOR,
            language: (data.settings.language as Language) || 'en',
          })
          // Apply colors immediately
          applyColors(data.settings.primaryColor || DEFAULT_PRIMARY_COLOR, data.settings.secondaryColor || DEFAULT_SECONDARY_COLOR)
        }
        if (data.store) {
          setStoreFormData({
            storeName: data.store.name || '',
            street: data.store.street || '',
            city: data.store.city || '',
            state: data.store.state || '',
            postalCode: data.store.postalCode || '',
            country: data.store.country || '',
            website: data.store.website || '',
            phone: data.store.phone || '',
            currency: data.store.currency || 'USD',
            vatNumber: data.store.vatNumber || '',
          })
          if (data.store.logo) {
            setLogoPreview(data.store.logo)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [])

  const applyColors = (primary: string, secondary: string) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-yellow', primary)
      document.documentElement.style.setProperty('--black', secondary)
    }
  }

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    fetchProfile()
    fetchSettings()
    fetchCountries()
  }, [session, router, fetchProfile, fetchSettings, fetchCountries])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileFormData),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        const successMsg = t.profile?.updateSuccess || 'Profile updated successfully'
        setSuccess(successMsg)
        showAlert.success(successMsg)
        await updateSession({
          user: {
            ...session?.user,
            name: data.user.name,
            email: data.user.email,
            image: data.user.profileImage,
          },
        })
      } else {
        const errorMsg = data.error || t.profile?.updateError || 'Failed to update profile'
        setError(errorMsg)
        showAlert.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = t.profile?.updateError || 'Failed to update profile'
      setError(errorMsg)
      showAlert.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      const errorMsg = t.profile?.passwordMismatch || 'New passwords do not match'
      setError(errorMsg)
      showAlert.error(errorMsg)
      return
    }

    // Validate password strength
    const passwordValidation = validatePasswordClient(passwordFormData.newPassword)
    if (!passwordValidation.valid) {
      const errorMsg = passwordValidation.error || t.profile?.passwordTooShort || 'Password validation failed'
      setError(errorMsg)
      showAlert.error(errorMsg)
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const successMsg = t.profile?.passwordChangeSuccess || 'Password changed successfully'
        setSuccess(successMsg)
        showAlert.success(successMsg)
        setPasswordFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        const errorMsg = data.error || t.profile?.passwordChangeError || 'Failed to change password'
        setError(errorMsg)
        showAlert.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = t.profile?.passwordChangeError || 'Failed to change password'
      setError(errorMsg)
      showAlert.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')
    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        const successMsg = t.profile?.imageUploadSuccess || 'Profile image updated successfully'
        setSuccess(successMsg)
        showAlert.success(successMsg)
        await updateSession({
          user: {
            ...session?.user,
            image: data.user.profile_image,
          },
        })
      } else {
        const errorMsg = data.error || t.profile?.imageUploadError || 'Failed to upload image'
        setError(errorMsg)
        showAlert.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = t.profile?.imageUploadError || 'Failed to upload image'
      setError(errorMsg)
      showAlert.error(errorMsg)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!confirm(t.profile?.deleteImageConfirm || 'Are you sure you want to delete your profile image?')) {
      return
    }

    setError('')
    setSuccess('')
    setUploadingImage(true)

    try {
      const response = await fetch('/api/profile/image', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        const successMsg = t.profile?.imageDeleteSuccess || 'Profile image deleted successfully'
        setSuccess(successMsg)
        showAlert.success(successMsg)
        await updateSession({
          user: {
            ...session?.user,
            image: null,
          },
        })
      } else {
        const errorMsg = data.error || t.profile?.imageDeleteError || 'Failed to delete image'
        setError(errorMsg)
        showAlert.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = t.profile?.imageDeleteError || 'Failed to delete image'
      setError(errorMsg)
      showAlert.error(errorMsg)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAppearanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSettingsLoading(true)

    try {
      // Use FormData if logo is being uploaded or removed, otherwise use JSON
      if (logo || removeLogo) {
        const formData = new FormData()
        formData.append('primaryColor', appearanceFormData.primaryColor)
        formData.append('secondaryColor', appearanceFormData.secondaryColor)
        formData.append('language', appearanceFormData.language)
        if (logo) {
          formData.append('logo', logo)
        }
        if (removeLogo) {
          formData.append('removeLogo', 'true')
        }

        const response = await fetch('/api/settings', {
          method: 'PATCH',
          body: formData,
        })

        const data = await response.json()

        if (response.ok) {
          const successMsg = t.settings?.appearanceUpdateSuccess || 'Appearance updated successfully'
          setSuccess(successMsg)
          showAlert.success(successMsg)
          // Apply colors immediately
          applyColors(appearanceFormData.primaryColor, appearanceFormData.secondaryColor)
          // Update language context if language changed
          if (data.settings?.language) {
            setLanguage(data.settings.language as Language)
          }
          // Update logo preview if logo was uploaded
          if (data.store?.logo) {
            setLogoPreview(data.store.logo)
            setLogo(null)
          } else if (removeLogo && data.store?.logo === null) {
            // Logo was removed
            setLogoPreview('')
            setLogo(null)
            setRemoveLogo(false)
          }
        } else {
          const errorMsg = data.error || t.settings?.appearanceUpdateError || 'Failed to update appearance'
          setError(errorMsg)
          showAlert.error(errorMsg)
        }
      } else {
        // No logo changes, just update colors and language with JSON
        const response = await fetch('/api/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appearanceFormData),
        })

        const data = await response.json()

        if (response.ok) {
          const successMsg = t.settings?.appearanceUpdateSuccess || 'Appearance updated successfully'
          setSuccess(successMsg)
          showAlert.success(successMsg)
          // Apply colors immediately
          applyColors(appearanceFormData.primaryColor, appearanceFormData.secondaryColor)
          // Update language context if language changed
          if (data.settings?.language) {
            setLanguage(data.settings.language as Language)
          }
        } else {
          const errorMsg = data.error || t.settings?.colorsUpdateError || 'Failed to update colors'
          setError(errorMsg)
          showAlert.error(errorMsg)
        }
      }
    } catch (err) {
      const errorMsg = t.settings?.appearanceUpdateError || 'Failed to update appearance'
      setError(errorMsg)
      showAlert.error(errorMsg)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleResetColors = () => {
    setAppearanceFormData({
      primaryColor: '#FFD700',
      secondaryColor: '#000000',
      language: 'en',
    })
  }

  const handleLogoChange = (file: File | null) => {
    setLogo(file)
    if (file) {
      setRemoveLogo(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setLogoPreview('')
      setRemoveLogo(true)
    }
  }

  const handleRemoveLogo = () => {
    setLogo(null)
    setLogoPreview('')
    setRemoveLogo(true)
  }

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setStoreLoading(true)

    try {
      const formData = new FormData()
      formData.append('storeName', storeFormData.storeName)
      if (storeFormData.street) formData.append('street', storeFormData.street)
      if (storeFormData.city) formData.append('city', storeFormData.city)
      if (storeFormData.state) formData.append('state', storeFormData.state)
      if (storeFormData.postalCode) formData.append('postalCode', storeFormData.postalCode)
      if (storeFormData.country) formData.append('country', storeFormData.country)
      if (storeFormData.website) formData.append('website', storeFormData.website)
      if (storeFormData.phone) formData.append('phone', storeFormData.phone)
      formData.append('currency', storeFormData.currency)
      if (storeFormData.vatNumber) formData.append('vatNumber', storeFormData.vatNumber)
      formData.append('primaryColor', appearanceFormData.primaryColor)
      formData.append('secondaryColor', appearanceFormData.secondaryColor)

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        const successMsg = t.settings?.storeUpdateSuccess || 'Store information updated successfully'
        setSuccess(successMsg)
        showAlert.success(successMsg)
      } else {
        const errorMsg = data.error || t.settings?.storeUpdateError || 'Failed to update store information'
        setError(errorMsg)
        showAlert.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = t.settings?.storeUpdateError || 'Failed to update store information'
      setError(errorMsg)
      showAlert.error(errorMsg)
    } finally {
      setStoreLoading(false)
    }
  }

  const selectedCountry = countries.find(c => c.code === storeFormData.country)
  const isEUCountry = selectedCountry?.requiresVat || false

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="settings-page">
          <div className="settings-page__container">
            <div className="settings-page__loading">
              <p>{t.auth.loading}</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?'

  return (
    <>
      <Navigation />
      <main className="settings-page">
        <div className="settings-page__container">
          <div className="settings-page__layout">
            <aside className="settings-page__sidebar">
              <h2 className="settings-page__sidebar-title">{t.settings?.title || 'Settings'}</h2>
              <nav className="settings-page__nav">
                <button
                  className={`settings-page__nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('profile')
                    setError('')
                    setSuccess('')
                  }}
                >
                  {t.settings?.profile || 'Profile'}
                </button>
                <button
                  className={`settings-page__nav-item ${activeTab === 'password' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('password')
                    setError('')
                    setSuccess('')
                  }}
                >
                  {t.settings?.security || 'Security'}
                </button>
                <button
                  className={`settings-page__nav-item ${activeTab === 'store' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('store')
                    setError('')
                    setSuccess('')
                  }}
                >
                  {t.settings?.store || 'Store'}
                </button>
                <button
                  className={`settings-page__nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('appearance')
                    setError('')
                    setSuccess('')
                  }}
                >
                  {t.settings?.appearance || 'Appearance'}
                </button>
              </nav>
            </aside>

            <div className="settings-page__main">
              {activeTab === 'profile' && (
                <div className="settings-page__section">
                  <div className="settings-page__card">
                    <div className="settings-page__card-header">
                      <h3 className="settings-page__card-title">
                        {t.settings?.profile || 'Profile'}
                      </h3>
                      <p className="settings-page__card-description">
                        {t.settings?.profileDescription || 'Update your account information and profile picture.'}
                      </p>
                    </div>

                    <div className="settings-page__card-content">
                      <div className="settings-page__avatar-section">
                        <div className="settings-page__avatar-wrapper">
                          {user?.profileImage ? (
                            <Image
                              src={user.profileImage}
                              alt={user.name || 'Profile'}
                              width={96}
                              height={96}
                              className="settings-page__avatar"
                            />
                          ) : (
                            <div className="settings-page__avatar-placeholder">
                              {userInitials}
                            </div>
                          )}
                        </div>
                        <div className="settings-page__avatar-actions">
                          <label className="settings-page__upload-btn" htmlFor="profile-image-upload">
                            {uploadingImage
                              ? t.profile?.uploading || 'Uploading...'
                              : t.profile?.uploadImage || 'Upload Image'}
                            <input
                              id="profile-image-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploadingImage}
                              className="settings-page__hidden-input"
                            />
                          </label>
                          {user?.profileImage && (
                            <button
                              className="settings-page__delete-btn"
                              onClick={handleDeleteImage}
                              disabled={uploadingImage}
                              type="button"
                            >
                              {t.profile?.deleteImage || 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>

                      <form onSubmit={handleProfileSubmit} className="settings-page__form">
                        <div className="settings-page__field">
                          <label htmlFor="name" className="settings-page__label">
                            {t.profile?.name || 'Name'}
                          </label>
                          <input
                            id="name"
                            type="text"
                            value={profileFormData.name}
                            onChange={(e) =>
                              setProfileFormData({ ...profileFormData, name: e.target.value })
                            }
                            disabled={saving}
                            className="settings-page__input"
                          />
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="email" className="settings-page__label">
                            {t.auth.email}
                          </label>
                          <input
                            id="email"
                            type="email"
                            value={profileFormData.email}
                            onChange={(e) =>
                              setProfileFormData({ ...profileFormData, email: e.target.value })
                            }
                            required
                            disabled={saving}
                            className="settings-page__input"
                          />
                        </div>

                        <div className="settings-page__form-actions">
                          <button
                            type="submit"
                            className="settings-page__submit-btn"
                            disabled={saving}
                          >
                            {saving ? t.profile?.saving || 'Saving...' : t.profile?.save || 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="settings-page__section">
                  <div className="settings-page__card">
                    <div className="settings-page__card-header">
                      <h3 className="settings-page__card-title">
                        {t.settings?.changePassword || 'Change Password'}
                      </h3>
                      <p className="settings-page__card-description">
                        {t.settings?.passwordDescription || 'Update your password to keep your account secure.'}
                      </p>
                    </div>

                    <div className="settings-page__card-content">
                      <form onSubmit={handlePasswordSubmit} className="settings-page__form">
                        <div className="settings-page__field">
                          <label htmlFor="currentPassword" className="settings-page__label">
                            {t.profile?.currentPassword || 'Current Password'}
                          </label>
                          <input
                            id="currentPassword"
                            type="password"
                            value={passwordFormData.currentPassword}
                            onChange={(e) =>
                              setPasswordFormData({
                                ...passwordFormData,
                                currentPassword: e.target.value,
                              })
                            }
                            required
                            disabled={saving}
                            autoComplete="current-password"
                            className="settings-page__input"
                          />
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="newPassword" className="settings-page__label">
                            {t.profile?.newPassword || 'New Password'}
                          </label>
                          <input
                            id="newPassword"
                            type="password"
                            value={passwordFormData.newPassword}
                            onChange={(e) =>
                              setPasswordFormData({
                                ...passwordFormData,
                                newPassword: e.target.value,
                              })
                            }
                            required
                            disabled={saving}
                            autoComplete="new-password"
                            minLength={6}
                            className="settings-page__input"
                          />
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="confirmPassword" className="settings-page__label">
                            {t.profile?.confirmPassword || 'Confirm New Password'}
                          </label>
                          <input
                            id="confirmPassword"
                            type="password"
                            value={passwordFormData.confirmPassword}
                            onChange={(e) =>
                              setPasswordFormData({
                                ...passwordFormData,
                                confirmPassword: e.target.value,
                              })
                            }
                            required
                            disabled={saving}
                            autoComplete="new-password"
                            minLength={6}
                            className="settings-page__input"
                          />
                        </div>

                        <div className="settings-page__form-actions">
                          <button
                            type="submit"
                            className="settings-page__submit-btn"
                            disabled={saving}
                          >
                            {saving
                              ? t.profile?.changing || 'Changing Password...'
                              : t.profile?.changePassword || 'Change Password'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'store' && (
                <div className="settings-page__section">
                  <div className="settings-page__card">
                    <div className="settings-page__card-header">
                      <h3 className="settings-page__card-title">
                        {t.settings?.store || 'Store Information'}
                      </h3>
                      <p className="settings-page__card-description">
                        {t.settings?.storeDescription || 'Update your store information.'}
                      </p>
                    </div>

                    <div className="settings-page__card-content">
                      <form onSubmit={handleStoreSubmit} className="settings-page__form">
                        <div className="settings-page__field">
                          <label htmlFor="storeName" className="settings-page__label">
                            {t.onboarding?.storeName || 'Store Name'} *
                          </label>
                          <input
                            id="storeName"
                            type="text"
                            value={storeFormData.storeName}
                            onChange={(e) =>
                              setStoreFormData({ ...storeFormData, storeName: e.target.value })
                            }
                            required
                            disabled={storeLoading}
                            className="settings-page__input"
                            placeholder={t.onboarding?.storeNamePlaceholder || 'Enter your store name'}
                          />
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="street" className="settings-page__label">
                            {t.onboarding?.street || 'Street Address'}
                          </label>
                          <input
                            id="street"
                            type="text"
                            value={storeFormData.street}
                            onChange={(e) =>
                              setStoreFormData({ ...storeFormData, street: e.target.value })
                            }
                            disabled={storeLoading}
                            className="settings-page__input"
                            placeholder={t.onboarding?.streetPlaceholder || 'Street address'}
                          />
                        </div>

                        <div className="settings-page__form-row">
                          <div className="settings-page__field">
                            <label htmlFor="city" className="settings-page__label">
                              {t.onboarding?.city || 'City'}
                            </label>
                            <input
                              id="city"
                              type="text"
                              value={storeFormData.city}
                              onChange={(e) =>
                                setStoreFormData({ ...storeFormData, city: e.target.value })
                              }
                              disabled={storeLoading}
                              className="settings-page__input"
                              placeholder={t.onboarding?.cityPlaceholder || 'City'}
                            />
                          </div>

                          <div className="settings-page__field">
                            <label htmlFor="state" className="settings-page__label">
                              {t.onboarding?.state || 'State/Province'}
                            </label>
                            <input
                              id="state"
                              type="text"
                              value={storeFormData.state}
                              onChange={(e) =>
                                setStoreFormData({ ...storeFormData, state: e.target.value })
                              }
                              disabled={storeLoading}
                              className="settings-page__input"
                              placeholder={t.onboarding?.statePlaceholder || 'State/Province'}
                            />
                          </div>
                        </div>

                        <div className="settings-page__form-row">
                          <div className="settings-page__field">
                            <label htmlFor="postalCode" className="settings-page__label">
                              {t.onboarding?.postalCode || 'Postal Code'}
                            </label>
                            <input
                              id="postalCode"
                              type="text"
                              value={storeFormData.postalCode}
                              onChange={(e) =>
                                setStoreFormData({ ...storeFormData, postalCode: e.target.value })
                              }
                              disabled={storeLoading}
                              className="settings-page__input"
                              placeholder={t.onboarding?.postalCodePlaceholder || 'Postal Code'}
                            />
                          </div>

                          <div className="settings-page__field">
                            <label htmlFor="country" className="settings-page__label">
                              {t.onboarding?.country || 'Country'}
                            </label>
                            <select
                              id="country"
                              value={storeFormData.country}
                              onChange={(e) => {
                                const selectedCode = e.target.value
                                const selectedCountry = countries.find(c => c.code === selectedCode)
                                setStoreFormData({ ...storeFormData, country: selectedCode })
                                // Clear VAT number if country doesn't require VAT
                                if (!selectedCountry?.requiresVat) {
                                  setStoreFormData(prev => ({ ...prev, vatNumber: '' }))
                                }
                              }}
                              className="settings-page__input"
                              disabled={storeLoading}
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

                        <div className="settings-page__field">
                          <label htmlFor="website" className="settings-page__label">
                            {t.onboarding?.website || 'Website'}
                          </label>
                          <input
                            id="website"
                            type="url"
                            value={storeFormData.website}
                            onChange={(e) =>
                              setStoreFormData({ ...storeFormData, website: e.target.value })
                            }
                            disabled={storeLoading}
                            className="settings-page__input"
                            placeholder={t.onboarding?.websitePlaceholder || 'https://example.com'}
                          />
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="phone" className="settings-page__label">
                            {t.onboarding?.phone || 'Phone'}
                          </label>
                          <input
                            id="phone"
                            type="tel"
                            value={storeFormData.phone}
                            onChange={(e) =>
                              setStoreFormData({ ...storeFormData, phone: e.target.value })
                            }
                            disabled={storeLoading}
                            className="settings-page__input"
                            placeholder={t.onboarding?.phonePlaceholder || 'Enter phone number'}
                          />
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="currency" className="settings-page__label">
                            {t.onboarding?.currency || 'Currency'} *
                          </label>
                          <select
                            id="currency"
                            value={storeFormData.currency}
                            onChange={(e) =>
                              setStoreFormData({ ...storeFormData, currency: e.target.value })
                            }
                            className="settings-page__input"
                            disabled={storeLoading}
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
                          <div className="settings-page__field">
                            <label htmlFor="vatNumber" className="settings-page__label">
                              {t.onboarding?.vatNumber || 'VAT Number'}
                            </label>
                            <input
                              id="vatNumber"
                              type="text"
                              value={storeFormData.vatNumber}
                              onChange={(e) =>
                                setStoreFormData({ ...storeFormData, vatNumber: e.target.value })
                              }
                              disabled={storeLoading || !storeFormData.country}
                              className="settings-page__input"
                              placeholder={t.onboarding?.vatNumberPlaceholder || 'VAT Number (optional)'}
                            />
                          </div>
                        )}

                        <div className="settings-page__form-actions">
                          <button
                            type="submit"
                            className="settings-page__submit-btn"
                            disabled={storeLoading || !storeFormData.storeName.trim()}
                          >
                            {storeLoading ? t.profile?.saving || 'Saving...' : t.profile?.save || 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="settings-page__section">
                  <div className="settings-page__card">
                    <div className="settings-page__card-header">
                      <h3 className="settings-page__card-title">
                        {t.settings?.appearance || 'Appearance'}
                      </h3>
                      <p className="settings-page__card-description">
                        {t.settings?.appearanceDescription || 'Customize the logo and colors of your application.'}
                      </p>
                    </div>

                    <div className="settings-page__card-content">
                      <form onSubmit={handleAppearanceSubmit} className="settings-page__form">
                        <div className="settings-page__field">
                          <label htmlFor="primaryColor" className="settings-page__label">
                            {t.settings?.primaryColor || 'Primary Color'}
                          </label>
                          <div className="settings-page__color-container">
                            <input
                              id="primaryColor"
                              type="color"
                              value={appearanceFormData.primaryColor}
                              onChange={(e) => {
                                const newColor = e.target.value
                                setAppearanceFormData({
                                  ...appearanceFormData,
                                  primaryColor: newColor,
                                })
                                applyColors(newColor, appearanceFormData.secondaryColor)
                              }}
                              className="settings-page__color-input"
                            />
                            <input
                              type="text"
                              value={appearanceFormData.primaryColor}
                              onChange={(e) => {
                                const newColor = e.target.value
                                setAppearanceFormData({
                                  ...appearanceFormData,
                                  primaryColor: newColor,
                                })
                                if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newColor)) {
                                  applyColors(newColor, appearanceFormData.secondaryColor)
                                }
                              }}
                              placeholder="#FFD700"
                              className="settings-page__input settings-page__color-text-input"
                            />
                          </div>
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="secondaryColor" className="settings-page__label">
                            {t.settings?.secondaryColor || 'Secondary Color'}
                          </label>
                          <div className="settings-page__color-container">
                            <input
                              id="secondaryColor"
                              type="color"
                              value={appearanceFormData.secondaryColor}
                              onChange={(e) => {
                                const newColor = e.target.value
                                setAppearanceFormData({
                                  ...appearanceFormData,
                                  secondaryColor: newColor,
                                })
                                applyColors(appearanceFormData.primaryColor, newColor)
                              }}
                              className="settings-page__color-input"
                            />
                            <input
                              type="text"
                              value={appearanceFormData.secondaryColor}
                              onChange={(e) => {
                                const newColor = e.target.value
                                setAppearanceFormData({
                                  ...appearanceFormData,
                                  secondaryColor: newColor,
                                })
                                if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newColor)) {
                                  applyColors(appearanceFormData.primaryColor, newColor)
                                }
                              }}
                              placeholder="#000000"
                              className="settings-page__input settings-page__color-text-input"
                            />
                          </div>
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="language" className="settings-page__label">
                            {t.settings?.language || 'Language'}
                          </label>
                          <select
                            id="language"
                            value={appearanceFormData.language}
                            onChange={(e) => {
                              setAppearanceFormData({
                                ...appearanceFormData,
                                language: e.target.value as Language,
                              })
                            }}
                            className="settings-page__input"
                            disabled={settingsLoading}
                          >
                            {getAllLanguages().map((lang) => (
                              <option key={lang.code} value={lang.code}>
                                {lang.nativeName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="settings-page__field">
                          <LogoUpload
                            preview={logoPreview}
                            onChange={handleLogoChange}
                            onRemove={handleRemoveLogo}
                            disabled={settingsLoading}
                            labelClassName="settings-page__label"
                            inputClassName="settings-page__input"
                          />
                        </div>

                        <div className="settings-page__form-actions">
                          <button
                            type="button"
                            onClick={handleResetColors}
                            className="settings-page__reset-btn"
                            disabled={settingsLoading}
                          >
                            {t.settings?.resetColors || 'Reset to Default'}
                          </button>
                          <button
                            type="submit"
                            className="settings-page__submit-btn"
                            disabled={settingsLoading}
                          >
                            {settingsLoading
                              ? t.profile?.saving || 'Saving...'
                              : t.profile?.save || 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

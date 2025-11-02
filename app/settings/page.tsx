'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'

import type { User } from '@/lib/userStorage'

type Tab = 'profile' | 'password' | 'appearance'

export default function SettingsPage() {
  const { t } = useLanguage()
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
    primaryColor: '#FFD700',
    secondaryColor: '#000000',
  })

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
        setError(t.profile?.fetchError || 'Failed to load profile')
      }
    } catch (err) {
      setError(t.profile?.fetchError || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [t.profile?.fetchError])

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setAppearanceFormData({
            primaryColor: data.settings.primaryColor || '#FFD700',
            secondaryColor: data.settings.secondaryColor || '#000000',
          })
          // Apply colors immediately
          applyColors(data.settings.primaryColor || '#FFD700', data.settings.secondaryColor || '#000000')
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
  }, [session, router, fetchProfile, fetchSettings])

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
        setSuccess(t.profile?.updateSuccess || 'Profile updated successfully')
        await updateSession({
          user: {
            ...session?.user,
            name: data.user.name,
            email: data.user.email,
            image: data.user.profileImage,
          },
        })
      } else {
        setError(data.error || t.profile?.updateError || 'Failed to update profile')
      }
    } catch (err) {
      setError(t.profile?.updateError || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setError(t.profile?.passwordMismatch || 'New passwords do not match')
      return
    }

    if (passwordFormData.newPassword.length < 6) {
      setError(t.profile?.passwordTooShort || 'Password must be at least 6 characters long')
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
        setSuccess(t.profile?.passwordChangeSuccess || 'Password changed successfully')
        setPasswordFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        setError(data.error || t.profile?.passwordChangeError || 'Failed to change password')
      }
    } catch (err) {
      setError(t.profile?.passwordChangeError || 'Failed to change password')
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
        setSuccess(t.profile?.imageUploadSuccess || 'Profile image updated successfully')
        await updateSession({
          user: {
            ...session?.user,
            image: data.user.profile_image,
          },
        })
      } else {
        setError(data.error || t.profile?.imageUploadError || 'Failed to upload image')
      }
    } catch (err) {
      setError(t.profile?.imageUploadError || 'Failed to upload image')
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
        setSuccess(t.profile?.imageDeleteSuccess || 'Profile image deleted successfully')
        await updateSession({
          user: {
            ...session?.user,
            image: null,
          },
        })
      } else {
        setError(data.error || t.profile?.imageDeleteError || 'Failed to delete image')
      }
    } catch (err) {
      setError(t.profile?.imageDeleteError || 'Failed to delete image')
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
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appearanceFormData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(t.settings?.colorsUpdateSuccess || 'Colors updated successfully')
        // Apply colors immediately
        applyColors(appearanceFormData.primaryColor, appearanceFormData.secondaryColor)
      } else {
        setError(data.error || t.settings?.colorsUpdateError || 'Failed to update colors')
      }
    } catch (err) {
      setError(t.settings?.colorsUpdateError || 'Failed to update colors')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleResetColors = () => {
    setAppearanceFormData({
      primaryColor: '#FFD700',
      secondaryColor: '#000000',
    })
  }

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
              {error && (
                <div className="settings-page__alert settings-page__alert--error" role="alert">
                  {error}
                </div>
              )}

              {success && (
                <div className="settings-page__alert settings-page__alert--success" role="alert">
                  {success}
                </div>
              )}

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
                              style={{ display: 'none' }}
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

              {activeTab === 'appearance' && (
                <div className="settings-page__section">
                  <div className="settings-page__card">
                    <div className="settings-page__card-header">
                      <h3 className="settings-page__card-title">
                        {t.settings?.appearance || 'Appearance'}
                      </h3>
                      <p className="settings-page__card-description">
                        {t.settings?.appearanceDescription || 'Customize the primary and secondary colors of your application.'}
                      </p>
                    </div>

                    <div className="settings-page__card-content">
                      <form onSubmit={handleAppearanceSubmit} className="settings-page__form">
                        <div className="settings-page__field">
                          <label htmlFor="primaryColor" className="settings-page__label">
                            {t.settings?.primaryColor || 'Primary Color'}
                          </label>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
                              style={{
                                width: '60px',
                                height: '40px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
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
                              className="settings-page__input"
                              style={{ flex: 1 }}
                            />
                          </div>
                        </div>

                        <div className="settings-page__field">
                          <label htmlFor="secondaryColor" className="settings-page__label">
                            {t.settings?.secondaryColor || 'Secondary Color'}
                          </label>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
                              style={{
                                width: '60px',
                                height: '40px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
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
                              className="settings-page__input"
                              style={{ flex: 1 }}
                            />
                          </div>
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

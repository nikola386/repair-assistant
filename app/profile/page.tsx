'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'

import type { User } from '@/lib/userStorage'

export default function ProfilePage() {
  const { t } = useLanguage()
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
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

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    fetchProfile()
  }, [session, router, fetchProfile])

  const handleSubmit = async (e: React.FormEvent) => {
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
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setSuccess(t.profile?.updateSuccess || 'Profile updated successfully')
        // Update session to reflect changes
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
        // Update session
        await updateSession({
          user: {
            ...session?.user,
            image: data.user.profileImage,
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

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="profile-page">
          <div className="container">
            <div className="profile-page__loading">
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
      <main className="profile-page">
        <div className="container">
          <div className="profile-page__wrapper">
            <h1>{t.profile?.title || 'My Profile'}</h1>

            {error && (
              <div className="profile-page__error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="profile-page__success" role="alert">
                {success}
              </div>
            )}

            <div className="profile-page__content">
              <div className="profile-page__image-section">
                <div className="profile-page__image-wrapper">
                  {user?.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt={user.name || 'Profile'}
                      width={150}
                      height={150}
                      className="profile-page__image"
                      style={{ objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <div className="profile-page__image-placeholder">
                      {userInitials}
                    </div>
                  )}
                </div>
                <div className="profile-page__image-actions">
                  <label className="btn btn-secondary btn-sm" htmlFor="profile-image-upload">
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
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteImage}
                      disabled={uploadingImage}
                    >
                      {t.profile?.deleteImage || 'Delete Image'}
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="profile-page__form">
                <div className="profile-page__field">
                  <label htmlFor="name">{t.profile?.name || 'Name'}</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={saving}
                  />
                </div>

                <div className="profile-page__field">
                  <label htmlFor="email">{t.auth.email}</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="profile-page__actions">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={saving}
                  >
                    {saving ? t.profile?.saving || 'Saving...' : t.profile?.save || 'Save Changes'}
                  </button>
                  <Link href="/profile/change-password" className="btn btn-secondary btn-sm">
                    {t.profile?.changePassword || 'Change Password'}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}


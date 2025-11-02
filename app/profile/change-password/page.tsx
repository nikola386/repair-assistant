'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ChangePasswordPage() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!session) {
      router.push('/login')
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError(t.profile?.passwordMismatch || 'New passwords do not match')
      return
    }

    // Validate password length
    if (formData.newPassword.length < 6) {
      setError(t.profile?.passwordTooShort || 'Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(t.profile?.passwordChangeSuccess || 'Password changed successfully')
        setFormData({
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
      setLoading(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Navigation />
      <main className="profile-page change-password-page">
        <div className="container">
          <div className="profile-page__wrapper">
            <h1>{t.profile?.changePassword || 'Change Password'}</h1>

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

            <form onSubmit={handleSubmit} className="profile-page__form">
              <div className="profile-page__field">
                <label htmlFor="currentPassword">
                  {t.profile?.currentPassword || 'Current Password'}
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, currentPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <div className="profile-page__field">
                <label htmlFor="newPassword">
                  {t.profile?.newPassword || 'New Password'}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <div className="profile-page__field">
                <label htmlFor="confirmPassword">
                  {t.profile?.confirmPassword || 'Confirm New Password'}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <div className="profile-page__actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading}
                >
                  {loading
                    ? t.profile?.changing || 'Changing Password...'
                    : t.profile?.changePassword || 'Change Password'}
                </button>
                <Link href="/profile" className="btn btn-secondary btn-sm">
                  {t.profile?.backToProfile || 'Back to Profile'}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}


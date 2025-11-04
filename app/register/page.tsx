'use client'

import { useState, FormEvent, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import { showAlert } from '@/lib/alerts'
import { validatePasswordClient } from '@/lib/validation'

export default function RegisterPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { data: session, status } = useSession()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/onboarding')
    }
  }, [status, router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      const errorMsg = t.auth?.passwordMismatch || 'Passwords do not match'
      setError(errorMsg)
      showAlert.error(errorMsg)
      return
    }

    // Validate password strength
    const passwordValidation = validatePasswordClient(password)
    if (!passwordValidation.valid) {
      const errorMsg = passwordValidation.error || t.auth?.passwordTooShort || 'Password validation failed'
      setError(errorMsg)
      showAlert.error(errorMsg)
      return
    }

    // Validate name is provided
    if (!name || name.trim().length === 0) {
      const errorMsg = t.auth?.nameRequired || 'Name is required'
      setError(errorMsg)
      showAlert.error(errorMsg)
      return
    }

    setLoading(true)

    try {
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || t.auth?.registrationError || 'Registration failed'
        setError(errorMsg)
        showAlert.error(errorMsg)
        setLoading(false)
        return
      }

      // Redirect to verification page instead of auto-login
      if (data.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        showAlert.success(t.auth?.emailVerificationSent || 'Verification email sent! Please check your inbox.')
      } else {
        // Fallback: try to login if verification is not required
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          const errorMsg = t.auth?.loginError || 'Registration successful but login failed. Please try logging in.'
          setError(errorMsg)
          showAlert.error(errorMsg)
          setLoading(false)
        } else if (result?.ok) {
          router.push('/onboarding')
          router.refresh()
        }
      }
    } catch (err) {
      const errorMsg = t.auth?.registrationError || 'An error occurred during registration'
      setError(errorMsg)
      showAlert.error(errorMsg)
      setLoading(false)
    }
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <Spinner size="small" />
          </div>
        </div>
      </div>
    )
  }

  // Don't show registration if already logged in (will redirect)
  if (status === 'authenticated') {
    return null
  }

  return (
    <div className="login-page">
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
            <h1 className="login-title">{t.auth?.registerTitle || 'Create Account'}</h1>
            <p className="login-subtitle">Welcome to Repair Assistant</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                {t.auth?.name || 'Name'}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
                autoComplete="name"
                disabled={loading}
                placeholder={t.auth?.namePlaceholder || 'Enter your name'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t.auth?.email || 'Email'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
                autoComplete="email"
                disabled={loading}
                placeholder={t.auth?.email || 'Enter your email'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {t.auth?.password || 'Password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
                autoComplete="new-password"
                disabled={loading}
                placeholder={t.auth?.password || 'Enter your password'}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                {t.auth?.confirmPassword || 'Confirm Password'}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                required
                autoComplete="new-password"
                disabled={loading}
                placeholder={t.auth?.confirmPassword || 'Confirm your password'}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="small" />
                  {t.auth?.registering || 'Creating account...'}
                </>
              ) : (
                t.auth?.register || 'Create Account'
              )}
            </button>

            <div className="login-footer">
              <p>
                {t.auth?.alreadyHaveAccount || 'Already have an account?'}{' '}
                <a href="/login" className="login-link">
                  {t.auth?.login || 'Login'}
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


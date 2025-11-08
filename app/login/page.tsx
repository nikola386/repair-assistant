'use client'

import { useState, FormEvent, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import { showAlert } from '@/lib/alerts'

function LoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Check if error is due to unverified email
        // Also check server-side if user exists and email is not verified
        try {
          const checkResponse = await fetch('/api/auth/check-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json()
            if (checkData.requiresVerification) {
              const errorMsg = t.auth?.emailNotVerified || 'Please verify your email address before logging in.'
              setError(errorMsg)
              showAlert.error(errorMsg)
              setLoading(false)
              router.push(`/verify-email?email=${encodeURIComponent(email)}`)
              return
            }
          }
        } catch (checkError) {
          // If check fails, continue with normal error handling
        }

        const errorMsg = t.auth?.loginError || 'Invalid email or password'
        setError(errorMsg)
        showAlert.error(errorMsg)
        setLoading(false)
      } else if (result?.ok) {
        // Check onboarding status and redirect accordingly
        const onboardingResponse = await fetch('/api/onboarding')
        const onboardingData = await onboardingResponse.json()
        
        if (!onboardingData.isComplete) {
          // Redirect to onboarding if not complete
          router.push('/onboarding')
        } else {
          // Redirect to the callback URL or dashboard
          router.push(callbackUrl)
        }
        router.refresh()
      }
    } catch (err) {
      // Handle EMAIL_NOT_VERIFIED error
      if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') {
        const errorMsg = t.auth?.emailNotVerified || 'Please verify your email address before logging in.'
        setError(errorMsg)
        showAlert.error(errorMsg)
        setLoading(false)
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }
      const errorMsg = t.auth?.loginError || 'An error occurred during login'
      setError(errorMsg)
      showAlert.error(errorMsg)
      setLoading(false)
    }
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
            <h1 className="login-title">{t.auth?.loginTitle || 'Login'}</h1>
            <p className="login-subtitle">Welcome to Repair Assistant</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t.common.fields.email}
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
                placeholder={t.common.fields.email}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {t.common.fields.password}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
                autoComplete="current-password"
                disabled={loading}
                placeholder={t.common.fields.password}
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
                  {t.common.messages.loading}
                </>
              ) : (
                t.auth?.login || 'Login'
              )}
            </button>

            <div className="login-footer">
              <p>
                {t.auth?.dontHaveAccount || "Don't have an account?"}{' '}
                <a href="/register" className="login-link">
                  {t.auth?.register || 'Sign Up'}
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h1 className="login-title">Login</h1>
              <p className="login-subtitle">Welcome to Repair Assistant</p>
            </div>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spinner size="small" />
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}


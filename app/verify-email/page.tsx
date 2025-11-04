'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import Spinner from '@/components/ui/Spinner'
import { showAlert } from '@/lib/alerts'

function VerifyEmailForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleVerification = useCallback(async (verificationToken: string) => {
    setVerificationStatus('verifying')
    setError('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        setVerificationStatus('error')
        setError(data.error || t.auth?.verificationError || 'Verification failed')
        showAlert.error(data.error || t.auth?.verificationError || 'Verification failed')
        return
      }

      setVerificationStatus('success')
      showAlert.success(t.auth?.emailVerified || 'Email verified successfully!')
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setVerificationStatus('error')
      const errorMsg = t.auth?.verificationError || 'An error occurred during verification'
      setError(errorMsg)
      showAlert.error(errorMsg)
    }
  }, [t, router])

  // Auto-verify if token is present
  useEffect(() => {
    if (token && verificationStatus === 'idle') {
      handleVerification(token)
    }
  }, [token, verificationStatus, handleVerification])

  // Handle resend cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResend = async () => {
    if (!email) {
      setError(t.auth?.emailRequired || 'Email address is required')
      return
    }

    if (resendCooldown > 0) {
      return
    }

    setResendLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t.auth?.resendError || 'Failed to resend verification email')
        showAlert.error(data.error || t.auth?.resendError || 'Failed to resend verification email')
        setResendLoading(false)
        
        // If rate limited, set cooldown to 60 seconds
        if (response.status === 429) {
          setResendCooldown(60)
        }
        return
      }

      showAlert.success(t.auth?.emailVerificationSent || 'Verification email sent! Please check your inbox.')
      setResendCooldown(60) // 1 minute cooldown
      setResendLoading(false)
    } catch (err) {
      setError(t.auth?.resendError || 'Failed to resend verification email')
      showAlert.error(t.auth?.resendError || 'Failed to resend verification email')
      setResendLoading(false)
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
      </div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">
              {verificationStatus === 'success' 
                ? (t.auth?.emailVerified || 'Email Verified!')
                : (t.auth?.verifyEmail || 'Verify Your Email')}
            </h1>
            <p className="login-subtitle">
              {verificationStatus === 'success'
                ? (t.auth?.redirectingToLogin || 'Redirecting to login...')
                : (t.auth?.checkEmail || 'Please check your email for verification link')}
            </p>
          </div>

          {verificationStatus === 'verifying' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Spinner size="small" />
              <p style={{ marginTop: '1rem', color: 'var(--gray-medium)' }}>
                {t.auth?.verifying || 'Verifying your email...'}
              </p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
              <p style={{ color: 'var(--gray-medium)', marginBottom: '2rem' }}>
                {t.auth?.emailVerifiedSuccess || 'Your email has been verified successfully!'}
              </p>
            </div>
          )}

          {(verificationStatus === 'idle' || verificationStatus === 'error') && (
            <div className="login-form">
              {email && (
                <div style={{ 
                  background: '#f0f0f0', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, color: 'var(--gray-medium)', fontSize: '0.9rem' }}>
                    {t.auth?.emailSentTo || 'Email sent to:'} <strong>{email}</strong>
                  </p>
                </div>
              )}

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              {!token && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <p style={{ color: 'var(--gray-medium)', marginBottom: '1.5rem' }}>
                    {t.auth?.clickLinkInEmail || 'Click the link in your email to verify your account, or request a new verification email.'}
                  </p>
                  {email && (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="btn btn-secondary"
                      disabled={resendLoading || resendCooldown > 0}
                      style={{ width: '100%' }}
                    >
                      {resendLoading ? (
                        <>
                          <Spinner size="small" />
                          {t.auth?.sending || 'Sending...'}
                        </>
                      ) : resendCooldown > 0 ? (
                        `${t.auth?.resendIn || 'Resend in'} ${resendCooldown}s`
                      ) : (
                        t.auth?.resendEmail || 'Resend Verification Email'
                      )}
                    </button>
                  )}
                </div>
              )}

              {token && verificationStatus === 'error' && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <p style={{ color: 'var(--gray-medium)', marginBottom: '1.5rem' }}>
                    {t.auth?.invalidToken || 'The verification link is invalid or has expired. Please request a new one.'}
                  </p>
                  {email && (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="btn btn-secondary"
                      disabled={resendLoading || resendCooldown > 0}
                      style={{ width: '100%' }}
                    >
                      {resendLoading ? (
                        <>
                          <Spinner size="small" />
                          {t.auth?.sending || 'Sending...'}
                        </>
                      ) : resendCooldown > 0 ? (
                        `${t.auth?.resendIn || 'Resend in'} ${resendCooldown}s`
                      ) : (
                        t.auth?.resendEmail || 'Resend Verification Email'
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="login-footer" style={{ marginTop: '2rem' }}>
                <p>
                  {t.auth?.backToLogin || 'Back to'}{' '}
                  <a href="/login" className="login-link">
                    {t.auth?.login || 'Login'}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h1 className="login-title">Verify Your Email</h1>
              <p className="login-subtitle">Please check your email</p>
            </div>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spinner size="small" />
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}


'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/users/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          password,
          name,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      router.push('/login?message=Account created successfully')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to accept invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '500px', margin: '100px auto' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>Accept Invitation</h1>
        
        {error && (
          <div style={{ 
            padding: '12px', 
            background: '#fee', 
            color: '#c33', 
            borderRadius: '4px', 
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Your Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password (min. 8 characters)"
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#ccc' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']),
})

interface InviteUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER'>('TECHNICIAN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          padding: '30px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '20px' }}>Invite User</h2>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            color: '#c33',
            borderRadius: '4px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
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
            <label htmlFor="role" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
              }}
            >
              <option value="VIEWER">Viewer</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
              {role === 'ADMIN' && 'Full access except cannot delete users'}
              {role === 'MANAGER' && 'Can manage tickets, customers, inventory, and reports'}
              {role === 'TECHNICIAN' && 'Can view and edit tickets, create customers'}
              {role === 'VIEWER' && 'Read-only access to tickets, customers, inventory, and reports'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: '#f0f0f0',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


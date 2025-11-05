'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useLanguage } from '@/contexts/LanguageContext'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']),
})

interface InviteUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const { t } = useLanguage()
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
        throw new Error(data.error || t.team.inviteError)
      }

      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : t.team.inviteError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="inventory-modal"
      onClick={onClose}
    >
      <div
        className="inventory-modal__content modal-content--medium"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inventory-modal__header">
          <h2 className="inventory-modal__title">{t.team.inviteUserTitle}</h2>
          <button
            className="inventory-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="inventory-modal__body">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                {t.team.emailAddress}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.team.emailPlaceholder}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="role" className="form-label">
                {t.team.role}
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="form-select"
              >
                <option value="VIEWER">{t.team.roles.viewer}</option>
                <option value="TECHNICIAN">{t.team.roles.technician}</option>
                <option value="MANAGER">{t.team.roles.manager}</option>
                <option value="ADMIN">{t.team.roles.admin}</option>
              </select>
              <p className="form-hint">
                {role === 'ADMIN' && t.team.roleDescriptions.admin}
                {role === 'MANAGER' && t.team.roleDescriptions.manager}
                {role === 'TECHNICIAN' && t.team.roleDescriptions.technician}
                {role === 'VIEWER' && t.team.roleDescriptions.viewer}
              </p>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn btn-secondary"
              >
                {t.common.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? t.team.sending : t.team.sendInvitation}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


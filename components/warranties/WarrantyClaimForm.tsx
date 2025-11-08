'use client'

import { useState, FormEvent } from 'react'
import { CreateWarrantyClaimInput } from '@/types/warranty'
import { useLanguage } from '@/contexts/LanguageContext'
import { showAlert } from '@/lib/alerts'

interface WarrantyClaimFormProps {
  warrantyId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function WarrantyClaimForm({ warrantyId, onSuccess, onCancel }: WarrantyClaimFormProps) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateWarrantyClaimInput>({
    warrantyId,
    issueDescription: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!formData.issueDescription.trim()) {
      showAlert.error(t.warranties.claim.issueDescriptionRequired)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/warranties/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        showAlert.success(t.warranties.claim.createSuccess)
        onSuccess()
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.warranties.claim.createError)
      }
    } catch (error) {
      console.error('Error creating warranty claim:', error)
      showAlert.error(t.warranties.claim.createError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inventory-form">
      <div className="inventory-form__section">
        <div className="inventory-form__field">
          <label className="inventory-form__label">
            {t.warranties.claim.issueDescription} <span className="required">*</span>
          </label>
          <textarea
            className="inventory-form__textarea"
            value={formData.issueDescription}
            onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
            rows={5}
            required
            placeholder={t.warranties.claim.issueDescriptionPlaceholder}
          />
        </div>

      </div>

      <div className="inventory-form__actions">
        <div className="inventory-form__action-buttons">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? t.common.messages.creating : t.warranties.claim.createClaim}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t.common.actions.cancel}
          </button>
        </div>
      </div>
    </form>
  )
}


'use client'

import { useState, FormEvent, useEffect } from 'react'
import { UpdateWarrantyInput, WarrantyType } from '../../types/warranty'
import { showAlert } from '../../lib/alerts'
import { useLanguage } from '../../contexts/LanguageContext'

interface WarrantyFormProps {
  onSubmit: (data: UpdateWarrantyInput) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<UpdateWarrantyInput>
  isEdit?: boolean
}

export default function WarrantyForm({ onSubmit, onCancel, initialData, isEdit = false }: WarrantyFormProps) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<UpdateWarrantyInput>({
    warrantyPeriodDays: initialData?.warrantyPeriodDays || 0,
    warrantyType: initialData?.warrantyType || 'both',
    terms: initialData?.terms || '',
    notes: initialData?.notes || '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        warrantyPeriodDays: initialData.warrantyPeriodDays || 0,
        warrantyType: initialData.warrantyType || 'both',
        terms: initialData.terms || '',
        notes: initialData.notes || '',
      })
    }
  }, [initialData])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (formData.warrantyPeriodDays !== undefined && formData.warrantyPeriodDays < 1) {
      showAlert.error(t.warranties.form.periodMinError)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting warranty form:', error)
      showAlert.error(isEdit ? t.warranties.form.updateError : t.warranties.form.createError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inventory-form">
      <div className="inventory-form__section">
        <div className="inventory-form__field">
          <label className="inventory-form__label">
            {t.warranties.form.warrantyPeriod} <span className="required">*</span>
          </label>
          <input
            type="number"
            className="inventory-form__input"
            value={formData.warrantyPeriodDays || ''}
            onChange={(e) => setFormData({ ...formData, warrantyPeriodDays: parseInt(e.target.value) || 0 })}
            min="1"
            required
          />
        </div>

        <div className="inventory-form__field">
          <label className="inventory-form__label">
            {t.warranties.form.warrantyType} <span className="required">*</span>
          </label>
          <select
            className="inventory-form__input"
            value={formData.warrantyType || 'both'}
            onChange={(e) => setFormData({ ...formData, warrantyType: e.target.value as WarrantyType })}
            required
          >
            <option value="parts">{t.warranties.type.parts}</option>
            <option value="labor">{t.warranties.type.labor}</option>
            <option value="both">{t.warranties.type.both}</option>
          </select>
        </div>

        <div className="inventory-form__field">
          <label className="inventory-form__label">{t.warranties.form.terms}</label>
          <textarea
            className="inventory-form__textarea"
            value={formData.terms || ''}
            onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
            rows={4}
            placeholder={t.warranties.form.termsPlaceholder}
          />
        </div>

        <div className="inventory-form__field">
          <label className="inventory-form__label">{t.warranties.form.notes}</label>
          <textarea
            className="inventory-form__textarea"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder={t.warranties.form.notesPlaceholder}
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
            {isSubmitting ? (isEdit ? t.common.messages.updating : t.common.messages.creating) : (isEdit ? t.common.actions.update : t.common.actions.create)}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {t.common.actions.cancel}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}


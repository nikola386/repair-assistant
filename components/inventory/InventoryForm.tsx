'use client'

import { useState, FormEvent, useEffect } from 'react'
import { CreateInventoryItemInput, UpdateInventoryItemInput } from '../../types/inventory'
import { showAlert } from '../../lib/alerts'
import { useLanguage } from '../../contexts/LanguageContext'

interface InventoryFormProps {
  onSubmit: (data: CreateInventoryItemInput | UpdateInventoryItemInput) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<CreateInventoryItemInput>
  isEdit?: boolean
  addAnother?: boolean
  onAddAnotherChange?: (value: boolean) => void
}

export default function InventoryForm({ onSubmit, onCancel, initialData, isEdit = false, addAnother = false, onAddAnotherChange }: InventoryFormProps) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateInventoryItemInput>({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    location: initialData?.location || '',
    currentQuantity: initialData?.currentQuantity || 0,
    minQuantity: initialData?.minQuantity || 0,
    unitPrice: initialData?.unitPrice,
    costPrice: initialData?.costPrice,
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        sku: initialData.sku || '',
        description: initialData.description || '',
        category: initialData.category || '',
        location: initialData.location || '',
        currentQuantity: initialData.currentQuantity || 0,
        minQuantity: initialData.minQuantity || 0,
        unitPrice: initialData.unitPrice,
        costPrice: initialData.costPrice,
      })
    }
  }, [initialData])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.name.trim()) {
      showAlert.error(t.inventory.form.nameRequired)
      return
    }

    if (formData.currentQuantity !== undefined && formData.currentQuantity < 0) {
      showAlert.error(t.inventory.form.quantityNonNegative)
      return
    }

    if (formData.minQuantity !== undefined && formData.minQuantity < 0) {
      showAlert.error(t.inventory.form.minQuantityNonNegative)
      return
    }

    if (formData.unitPrice !== undefined && formData.unitPrice < 0) {
      showAlert.error(t.inventory.form.unitPriceNonNegative)
      return
    }

    if (formData.costPrice !== undefined && formData.costPrice < 0) {
      showAlert.error(t.inventory.form.costPriceNonNegative)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      if (!isEdit) {
        setFormData({
          name: '',
          sku: '',
          description: '',
          category: '',
          location: '',
          currentQuantity: 0,
          minQuantity: 0,
          unitPrice: undefined,
          costPrice: undefined,
        })
      }
    } catch (error) {
      console.error('Error submitting inventory form:', error)
      showAlert.error(isEdit ? t.inventory.form.updateError : t.inventory.form.createError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inventory-form">
      <div className="inventory-form__section">
        <h3>{t.inventory.form.basicInformation}</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="name" className="inventory-form__label">
            {t.common.fields.name} <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="inventory-form__input"
            required
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="sku" className="inventory-form__label">
            {t.common.fields.sku}
          </label>
          <input
            type="text"
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="inventory-form__input"
            placeholder={t.inventory.form.optional}
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="description" className="inventory-form__label">
            {t.inventory.form.description}
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="inventory-form__textarea"
            rows={3}
            placeholder={t.inventory.form.optionalDescription}
          />
        </div>
      </div>

      <div className="inventory-form__section">
        <h3>{t.inventory.form.organization}</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="category" className="inventory-form__label">
            {t.common.fields.category}
          </label>
          <input
            type="text"
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="inventory-form__input"
            placeholder={t.inventory.form.categoryPlaceholder}
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="location" className="inventory-form__label">
            {t.common.fields.location}
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="inventory-form__input"
            placeholder={t.inventory.form.locationPlaceholder}
          />
        </div>
      </div>

      <div className="inventory-form__section">
        <h3>{t.inventory.form.quantities}</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="currentQuantity" className="inventory-form__label">
            {t.inventory.form.currentQuantity}
          </label>
          <input
            type="number"
            id="currentQuantity"
            min="0"
            step="1"
            value={formData.currentQuantity}
            onChange={(e) =>
              setFormData({ ...formData, currentQuantity: parseFloat(e.target.value) || 0 })
            }
            className="inventory-form__input"
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="minQuantity" className="inventory-form__label">
            {t.inventory.form.minimumQuantity}
          </label>
          <input
            type="number"
            id="minQuantity"
            min="0"
            step="1"
            value={formData.minQuantity}
            onChange={(e) =>
              setFormData({ ...formData, minQuantity: parseFloat(e.target.value) || 0 })
            }
            className="inventory-form__input"
          />
          <small className="inventory-form__hint">
            {t.inventory.form.minimumQuantityHint}
          </small>
        </div>
      </div>

      <div className="inventory-form__section">
        <h3>{t.inventory.form.pricing}</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="unitPrice" className="inventory-form__label">
            {t.inventory.form.unitPriceLabel}
          </label>
          <input
            type="number"
            id="unitPrice"
            min="0"
            step="0.01"
            value={formData.unitPrice || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                unitPrice: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            className="inventory-form__input"
            placeholder={t.inventory.form.optional}
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="costPrice" className="inventory-form__label">
            {t.inventory.form.costPriceLabel}
          </label>
          <input
            type="number"
            id="costPrice"
            min="0"
            step="0.01"
            value={formData.costPrice || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                costPrice: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            className="inventory-form__input"
            placeholder={t.inventory.form.optional}
          />
        </div>
      </div>

      <div className="inventory-form__actions">
        {!isEdit && onAddAnotherChange && (
          <label className="inventory-form__add-another">
            <input
              type="checkbox"
              checked={addAnother}
              onChange={(e) => onAddAnotherChange(e.target.checked)}
              disabled={isSubmitting}
              className="inventory-form__add-another-checkbox"
            />
            <span>{t.inventory.form.addAnother}</span>
          </label>
        )}
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


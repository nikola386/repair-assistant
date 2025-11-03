'use client'

import { useState, FormEvent, useEffect } from 'react'
import { CreateInventoryItemInput, UpdateInventoryItemInput } from '../../types/inventory'
import { showAlert } from '../../lib/alerts'

interface InventoryFormProps {
  onSubmit: (data: CreateInventoryItemInput | UpdateInventoryItemInput) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<CreateInventoryItemInput>
  isEdit?: boolean
}

export default function InventoryForm({ onSubmit, onCancel, initialData, isEdit = false }: InventoryFormProps) {
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

  // Update form data when initialData changes (for edit mode)
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
      showAlert.error('Name is required')
      return
    }

    if (formData.currentQuantity !== undefined && formData.currentQuantity < 0) {
      showAlert.error('Current quantity must be non-negative')
      return
    }

    if (formData.minQuantity !== undefined && formData.minQuantity < 0) {
      showAlert.error('Min quantity must be non-negative')
      return
    }

    if (formData.unitPrice !== undefined && formData.unitPrice < 0) {
      showAlert.error('Unit price must be non-negative')
      return
    }

    if (formData.costPrice !== undefined && formData.costPrice < 0) {
      showAlert.error('Cost price must be non-negative')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form on success only for create mode
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
      showAlert.error(isEdit ? 'Failed to update inventory item' : 'Failed to create inventory item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inventory-form">
      <div className="inventory-form__section">
        <h3>Basic Information</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="name" className="inventory-form__label">
            Name <span className="required">*</span>
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
            SKU
          </label>
          <input
            type="text"
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="inventory-form__input"
            placeholder="Optional"
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="description" className="inventory-form__label">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="inventory-form__textarea"
            rows={3}
            placeholder="Optional description"
          />
        </div>
      </div>

      <div className="inventory-form__section">
        <h3>Organization</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="category" className="inventory-form__label">
            Category
          </label>
          <input
            type="text"
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="inventory-form__input"
            placeholder="e.g., Screens, Batteries, Cables"
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="location" className="inventory-form__label">
            Location
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="inventory-form__input"
            placeholder="e.g., Shelf A-1, Warehouse 2"
          />
        </div>
      </div>

      <div className="inventory-form__section">
        <h3>Quantities</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="currentQuantity" className="inventory-form__label">
            Current Quantity
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
            Minimum Quantity (Low Stock Threshold)
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
            Item will be marked as low stock when quantity falls at or below this value
          </small>
        </div>
      </div>

      <div className="inventory-form__section">
        <h3>Pricing</h3>
        
        <div className="inventory-form__field">
          <label htmlFor="unitPrice" className="inventory-form__label">
            Unit Price (Selling Price)
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
            placeholder="Optional"
          />
        </div>

        <div className="inventory-form__field">
          <label htmlFor="costPrice" className="inventory-form__label">
            Cost Price (Purchase Price)
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
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="inventory-form__actions">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Item' : 'Create Item')}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}


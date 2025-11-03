'use client'

import { useState, useRef, useEffect } from 'react'
import { InventoryItem } from '../../types/inventory'
import { showAlert } from '../../lib/alerts'
import InventoryForm from './InventoryForm'
import { useLanguage } from '../../contexts/LanguageContext'

interface InventoryTableProps {
  items: InventoryItem[]
  onItemUpdate?: (item: InventoryItem) => void
  onItemDelete?: (itemId: string) => void
  onQuantityAdjust?: (itemId: string, quantityChange: number) => void
  editable?: boolean
  isLoading?: boolean
}

export default function InventoryTable({
  items,
  onItemUpdate,
  onItemDelete,
  onQuantityAdjust,
  editable = true,
  isLoading = false,
}: InventoryTableProps) {
  const { t } = useLanguage()
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
  }

  const handleUpdate = async (data: any) => {
    if (!editingItem || !onItemUpdate) return

    try {
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        onItemUpdate(result.item)
        setEditingItem(null)
        showAlert.success(t.inventory.table.updateSuccess)
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.inventory.table.updateError)
      }
    } catch (error) {
      console.error('Error updating item:', error)
      showAlert.error(t.inventory.table.updateError)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!onItemDelete) return

    if (!confirm(t.common.messages.confirmDelete)) {
      return
    }

    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onItemDelete(itemId)
        showAlert.success(t.inventory.table.deleteSuccess)
      } else {
        showAlert.error(t.inventory.table.deleteError)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      showAlert.error(t.inventory.table.deleteError)
    }
  }

  const handleQuantityAdjust = async (itemId: string) => {
    if (!onQuantityAdjust) return

    const quantityChange = parseFloat(adjustQuantity)
    if (isNaN(quantityChange) || quantityChange === 0) {
      showAlert.error(t.inventory.table.quantityChangeError)
      return
    }

    try {
      const response = await fetch(`/api/inventory/${itemId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: quantityChange }),
      })

      if (response.ok) {
        const data = await response.json()
        onQuantityAdjust(itemId, quantityChange)
        setAdjustingId(null)
        setAdjustQuantity('')
        showAlert.success(data.message || t.inventory.table.adjustSuccess)
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.inventory.table.adjustError)
      }
    } catch (error) {
      console.error('Error adjusting quantity:', error)
      showAlert.error(t.inventory.table.adjustError)
    }
  }

  const cancelEdit = () => {
    setEditingItem(null)
  }

  const cancelAdjust = () => {
    setAdjustingId(null)
    setAdjustQuantity('')
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const menuElement = menuRefs.current.get(openMenuId)
        const buttonElement = buttonRefs.current.get(openMenuId)
        const target = event.target as Node
        
        if (menuElement && !menuElement.contains(target) && 
            buttonElement && !buttonElement.contains(target)) {
          setOpenMenuId(null)
          setMenuPosition(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])
  
  // Update menu position on scroll
  useEffect(() => {
    if (!openMenuId || !menuPosition) return

    const updatePosition = () => {
      const buttonElement = buttonRefs.current.get(openMenuId)
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect()
        setMenuPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        })
      }
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [openMenuId, menuPosition])

  const toggleMenu = (itemId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === itemId) {
      setOpenMenuId(null)
      setMenuPosition(null)
      return
    }

    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setOpenMenuId(itemId)
  }

  const handleMenuAction = (action: string, item: InventoryItem) => {
    setOpenMenuId(null)
    setMenuPosition(null)
    
    if (action === 'edit') {
      handleEdit(item)
    } else if (action === 'adjust') {
      setAdjustingId(item.id)
      setAdjustQuantity('')
    } else if (action === 'delete') {
      handleDelete(item.id)
    }
  }

  const isLowStock = (item: InventoryItem) => {
    return item.currentQuantity <= item.minQuantity
  }

  if (items.length === 0) {
    return <p className="inventory-table__empty">{t.inventory.table.noItems}</p>
  }

  return (
    <>
      <div className="inventory-table">
        <table className="inventory-table__table">
          <thead>
            <tr>
              <th>{t.common.fields.name}</th>
              <th>{t.common.fields.sku}</th>
              <th>{t.common.fields.category}</th>
              <th>{t.common.fields.location}</th>
              <th>{t.common.fields.quantity}</th>
              <th>{t.inventory.minQuantity}</th>
              <th>{t.inventory.unitPrice}</th>
              <th>{t.common.fields.status}</th>
              {editable && <th>{t.common.labels.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={isLowStock(item) ? 'inventory-table__row--low-stock' : ''}
              >
                <td>{item.name}</td>
                <td>{item.sku || '-'}</td>
                <td>{item.category || '-'}</td>
                <td>{item.location || '-'}</td>
                <td className={isLowStock(item) ? 'inventory-table__quantity--low' : ''}>
                  {item.currentQuantity}
                </td>
                <td>{item.minQuantity}</td>
                <td>{item.unitPrice !== undefined ? `$${item.unitPrice.toFixed(2)}` : '-'}</td>
                <td>
                  {isLowStock(item) ? (
                    <span className="inventory-table__status--low">{t.inventory.lowStock}</span>
                  ) : (
                    <span className="inventory-table__status--ok">{t.inventory.ok}</span>
                  )}
                </td>
                {editable && (
                  <td>
                    <div 
                      className="inventory-table__menu"
                      ref={(el) => {
                        if (el) {
                          menuRefs.current.set(item.id, el)
                        } else {
                          menuRefs.current.delete(item.id)
                        }
                      }}
                    >
                      <button
                        type="button"
                        className="inventory-table__menu-button"
                        onClick={(e) => toggleMenu(item.id, e)}
                        disabled={isLoading}
                        aria-label="Actions"
                        ref={(el) => {
                          if (el) {
                            buttonRefs.current.set(item.id, el)
                          } else {
                            buttonRefs.current.delete(item.id)
                          }
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <circle cx="10" cy="4" r="2" />
                          <circle cx="10" cy="10" r="2" />
                          <circle cx="10" cy="16" r="2" />
                        </svg>
                      </button>
                      {openMenuId === item.id && menuPosition && (
                        <div 
                          className="inventory-table__menu-dropdown"
                          ref={(el) => {
                            if (el) {
                              menuRefs.current.set(item.id, el)
                            } else {
                              menuRefs.current.delete(item.id)
                            }
                          }}
                          style={{
                            top: `${menuPosition.top}px`,
                            right: `${menuPosition.right}px`,
                          }}
                        >
                          <button
                            type="button"
                            className="inventory-table__menu-item"
                            onClick={() => handleMenuAction('edit', item)}
                          >
                            {t.common.actions.edit}
                          </button>
                          <button
                            type="button"
                            className="inventory-table__menu-item"
                            onClick={() => handleMenuAction('adjust', item)}
                            disabled={adjustingId !== null && adjustingId !== item.id}
                          >
                            {t.inventory.adjust}
                          </button>
                          <button
                            type="button"
                            className="inventory-table__menu-item inventory-table__menu-item--danger"
                            onClick={() => handleMenuAction('delete', item)}
                          >
                            {t.common.actions.delete}
                          </button>
                        </div>
                      )}
                    </div>
                    {adjustingId === item.id && (
                      <div className="inventory-table__adjust-form">
                        <input
                          type="number"
                          placeholder={t.inventory.table.quantityChangePlaceholder}
                          value={adjustQuantity}
                          onChange={(e) => setAdjustQuantity(e.target.value)}
                          className="inventory-table__adjust-input"
                        />
                        <div className="inventory-table__adjust-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleQuantityAdjust(item.id)}
                            disabled={isLoading}
                          >
                            {t.common.actions.apply}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={cancelAdjust}
                            disabled={isLoading}
                          >
                            {t.common.actions.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="inventory-modal" onClick={cancelEdit}>
          <div className="inventory-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal__header">
              <h2 className="inventory-modal__title">{t.inventory.table.editItem}</h2>
              <button
                className="inventory-modal__close"
                onClick={cancelEdit}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="inventory-modal__body">
              <InventoryForm
                onSubmit={handleUpdate}
                onCancel={cancelEdit}
                initialData={{
                  name: editingItem.name,
                  sku: editingItem.sku,
                  description: editingItem.description,
                  category: editingItem.category,
                  location: editingItem.location,
                  currentQuantity: editingItem.currentQuantity,
                  minQuantity: editingItem.minQuantity,
                  unitPrice: editingItem.unitPrice,
                  costPrice: editingItem.costPrice,
                }}
                isEdit={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

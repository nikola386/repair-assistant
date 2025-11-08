'use client'

import { useState, useRef, useEffect } from 'react'
import { Warranty, UpdateWarrantyInput } from '../../types/warranty'
import { useLanguage } from '../../contexts/LanguageContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { showAlert } from '@/lib/alerts'
import { useConfirmation } from '@/lib/useConfirmation'
import ConfirmationModal from '../ui/ConfirmationModal'
import WarrantyClaimForm from './WarrantyClaimForm'
import WarrantyForm from './WarrantyForm'
import WarrantyStatusBadge from './WarrantyStatusBadge'

interface WarrantyTableProps {
  warranties: Warranty[]
  onWarrantyUpdate?: (warranty: Warranty) => void
  isLoading?: boolean
}

export default function WarrantyTable({ warranties, onWarrantyUpdate, isLoading = false }: WarrantyTableProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const confirmation = useConfirmation()
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const [showClaimForm, setShowClaimForm] = useState<string | null>(null)
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null)
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getWarrantyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      parts: t.warranties.type.parts,
      labor: t.warranties.type.labor,
      both: t.warranties.type.both,
    }
    return labels[type] || type
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

  const toggleMenu = (warrantyId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === warrantyId) {
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
    setOpenMenuId(warrantyId)
  }

  const handleMenuAction = (action: string, warranty: Warranty) => {
    setOpenMenuId(null)
    setMenuPosition(null)
    
    if (action === 'edit') {
      setEditingWarranty(warranty)
    } else if (action === 'claim') {
      setShowClaimForm(warranty.id)
    } else if (action === 'void') {
      handleVoidWarranty(warranty)
    }
  }

  const handleUpdate = async (data: UpdateWarrantyInput) => {
    if (!editingWarranty) return

    try {
      const response = await fetch(`/api/warranties/${editingWarranty.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        if (onWarrantyUpdate) {
          onWarrantyUpdate(result.warranty)
        }
        setEditingWarranty(null)
        router.refresh()
        showAlert.success(t.warranties.form.updateSuccess)
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.warranties.form.updateError)
      }
    } catch (error) {
      console.error('Error updating warranty:', error)
      showAlert.error(t.warranties.form.updateError)
    }
  }

  const handleVoidWarranty = async (warranty: Warranty) => {
    const confirmed = await confirmation.confirm({
      message: t.warranties.void.confirmMessage,
      variant: 'danger',
      confirmText: t.warranties.void.confirmText,
      cancelText: t.warranties.void.cancelText,
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/warranties/${warranty.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        if (onWarrantyUpdate) {
          onWarrantyUpdate(data.warranty)
        }
        router.refresh()
        showAlert.success(t.warranties.void.success)
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.warranties.void.error)
      }
    } catch (error) {
      console.error('Error voiding warranty:', error)
      showAlert.error(t.warranties.void.error)
    }
  }

  const handleClaimSuccess = () => {
    setShowClaimForm(null)
    router.refresh()
  }

  const cancelEdit = () => {
    setEditingWarranty(null)
  }

  if (warranties.length === 0) {
    return <p className="inventory-table__empty">{t.warranties.noWarrantiesFound}</p>
  }

  return (
    <>
      <div className="inventory-table">
        <div className="inventory-table__table-container">
          <table className="inventory-table__table">
            <thead>
              <tr>
                <th>{t.warranties.table.ticketNumber}</th>
                <th>{t.warranties.table.customer}</th>
                <th>{t.warranties.table.device}</th>
                <th>{t.warranties.table.type}</th>
                <th>{t.warranties.table.period}</th>
                <th>{t.warranties.table.startDate}</th>
                <th>{t.warranties.table.expiryDate}</th>
                <th>{t.warranties.table.status}</th>
                <th>{t.warranties.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {warranties.map((warranty) => (
                <tr key={warranty.id}>
                  <td>
                    <Link href={`/tickets/${warranty.ticketId}`} className="ticket-table__link">
                      {warranty.ticket?.ticketNumber || 'N/A'}
                    </Link>
                  </td>
                  <td>
                    {warranty.customer?.name || warranty.ticket?.customerName || 'Unknown'}
                  </td>
                  <td>
                    {warranty.ticket?.deviceType || 'N/A'}
                    {warranty.ticket?.deviceBrand && ` • ${warranty.ticket.deviceBrand}`}
                    {warranty.ticket?.deviceModel && ` ${warranty.ticket.deviceModel}`}
                  </td>
                  <td>{getWarrantyTypeLabel(warranty.warrantyType)}</td>
                  <td>{warranty.warrantyPeriodDays} days</td>
                  <td>{formatDate(warranty.startDate)}</td>
                  <td>{formatDate(warranty.expiryDate)}</td>
                  <td>
                    <WarrantyStatusBadge status={warranty.status} expiryDate={warranty.expiryDate} />
                  </td>
                  <td>
                    <div 
                      className="inventory-table__menu"
                      ref={(el) => {
                        if (el) {
                          menuRefs.current.set(warranty.id, el)
                        } else {
                          menuRefs.current.delete(warranty.id)
                        }
                      }}
                    >
                      <button
                        type="button"
                        className="inventory-table__menu-button"
                        onClick={(e) => toggleMenu(warranty.id, e)}
                        disabled={isLoading}
                        aria-label={t.warranties.table.actions}
                        ref={(el) => {
                          if (el) {
                            buttonRefs.current.set(warranty.id, el)
                          } else {
                            buttonRefs.current.delete(warranty.id)
                          }
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <circle cx="10" cy="4" r="2" />
                          <circle cx="10" cy="10" r="2" />
                          <circle cx="10" cy="16" r="2" />
                        </svg>
                      </button>
                      {openMenuId === warranty.id && menuPosition && (
                        <div 
                          className="inventory-table__menu-dropdown"
                          ref={(el) => {
                            if (el) {
                              menuRefs.current.set(warranty.id, el)
                            } else {
                              menuRefs.current.delete(warranty.id)
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
                            onClick={() => handleMenuAction('edit', warranty)}
                          >
                            {t.warranties.table.edit}
                          </button>
                          {warranty.status === 'active' && (
                            <button
                              type="button"
                              className="inventory-table__menu-item"
                              onClick={() => handleMenuAction('claim', warranty)}
                            >
                              {t.warranties.table.createClaim}
                            </button>
                          )}
                          {warranty.status === 'active' && (
                            <button
                              type="button"
                              className="inventory-table__menu-item inventory-table__menu-item--danger"
                              onClick={() => handleMenuAction('void', warranty)}
                            >
                              {t.warranties.table.voidWarranty}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingWarranty && (
        <div className="inventory-modal" onClick={cancelEdit}>
          <div className="inventory-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal__header">
              <h2 className="inventory-modal__title">{t.warranties.table.editWarranty}</h2>
              <button
                className="inventory-modal__close"
                onClick={cancelEdit}
                aria-label={t.common.actions.cancel}
              >
                ×
              </button>
            </div>
            <div className="inventory-modal__body">
              <WarrantyForm
                onSubmit={handleUpdate}
                onCancel={cancelEdit}
                initialData={{
                  warrantyPeriodDays: editingWarranty.warrantyPeriodDays,
                  warrantyType: editingWarranty.warrantyType,
                  terms: editingWarranty.terms || '',
                  notes: editingWarranty.notes || '',
                }}
                isEdit={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimForm && (
        <div className="inventory-modal" onClick={() => setShowClaimForm(null)}>
          <div className="inventory-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal__header">
              <h2 className="inventory-modal__title">{t.warranties.table.createWarrantyClaim}</h2>
              <button
                className="inventory-modal__close"
                onClick={() => setShowClaimForm(null)}
                aria-label={t.common.actions.cancel}
              >
                ×
              </button>
            </div>
            <div className="inventory-modal__body">
              <WarrantyClaimForm
                warrantyId={showClaimForm}
                onSuccess={handleClaimSuccess}
                onCancel={() => setShowClaimForm(null)}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        variant={confirmation.variant}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
      />
    </>
  )
}

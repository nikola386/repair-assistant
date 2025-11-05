'use client'

import { useState, useEffect, useRef } from 'react'
import { showAlert } from '@/lib/alerts'
import { useConfirmation } from '@/lib/useConfirmation'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { useLanguage } from '@/contexts/LanguageContext'

interface TeamMember {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  profileImage: string | null
  createdAt: Date
  invitedBy: string | null
  type: 'user' | 'invitation'
  invitationId?: string
  invitationToken?: string
  expiresAt?: Date
}

interface UserTableProps {
  users: TeamMember[]
  canEdit: boolean
  currentUserId?: string
  onUpdate: () => void
}

export default function UserTable({ users, canEdit, currentUserId, onUpdate }: UserTableProps) {
  const { t } = useLanguage()
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null)
  const [editingRole, setEditingRole] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const confirmation = useConfirmation()

  const handleEditRole = (user: TeamMember) => {
    if (user.type === 'invitation') return // Can't edit invitation roles
    setEditingUser(user)
    setEditingRole(user.role)
  }

  const handleSaveRole = async () => {
    if (!editingUser) return

    setSaving(true)
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editingRole }),
      })

      if (!res.ok) {
        const error = await res.json()
        showAlert.error(error.error || t.team.editRole.updateError)
        return
      }

      setEditingUser(null)
      setEditingRole('')
      showAlert.success(t.team.editRole.updateSuccess)
      onUpdate()
    } catch (error) {
      showAlert.error(t.team.editRole.updateError)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setEditingRole('')
  }

  const handleDeactivate = async (userId: string) => {
    const confirmed = await confirmation.confirm({
      message: t.team.deactivate.confirmMessage,
      variant: 'danger',
      confirmText: t.team.deactivate.confirmText,
      cancelText: t.team.deactivate.cancelText,
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        showAlert.error(error.error || t.team.deactivate.error)
        return
      }

      setDeletingId(null)
      showAlert.success(t.team.deactivate.success)
      onUpdate()
    } catch (error) {
      showAlert.error(t.team.deactivate.error)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId)
    try {
      const res = await fetch('/api/users/resend-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })

      if (!res.ok) {
        const error = await res.json()
        showAlert.error(error.error || t.team.resendInvitation.error)
        return
      }

      showAlert.success(t.team.resendInvitation.success)
      onUpdate()
    } catch (error) {
      showAlert.error(t.team.resendInvitation.error)
    } finally {
      setResendingId(null)
    }
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

  const toggleMenu = (userId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === userId) {
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
    setOpenMenuId(userId)
  }

  const handleMenuAction = (action: string, member: TeamMember) => {
    setOpenMenuId(null)
    setMenuPosition(null)
    
    if (action === 'edit') {
      handleEditRole(member)
    } else if (action === 'deactivate') {
      handleDeactivate(member.id)
    } else if (action === 'resend') {
      if (member.invitationId) {
        handleResendInvitation(member.invitationId)
      }
    }
  }

  const roleDisplay = {
    ADMIN: t.team.roles.admin,
    MANAGER: t.team.roles.manager,
    TECHNICIAN: t.team.roles.technician,
    VIEWER: t.team.roles.viewer,
  }

  if (users.length === 0) {
    return (
      <div className="empty-state">
        {t.team.table.noUsersFound}
      </div>
    )
  }

  return (
    <>
      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t.team.table.name}</th>
              <th>{t.team.table.email}</th>
              <th>{t.team.table.role}</th>
              <th>{t.team.table.status}</th>
              <th>{t.team.table.joined}</th>
              {canEdit && <th>{t.team.table.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((member) => (
              <tr key={member.id}>
                <td>
                  {member.name || '—'}
                </td>
                <td>
                  {member.email}
                </td>
                <td>
                  <span className={`badge badge--role-${member.role.toLowerCase()}`}>
                    {roleDisplay[member.role as keyof typeof roleDisplay] || member.role}
                  </span>
                </td>
                <td>
                  {member.type === 'invitation' ? (
                    <span className="badge badge--status-pending">
                      {t.team.table.pending}
                    </span>
                  ) : (
                    <span className={`badge badge--status-${member.isActive ? 'active' : 'inactive'}`}>
                      {member.isActive ? t.team.table.active : t.team.table.inactive}
                    </span>
                  )}
                </td>
                <td>
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
                {canEdit && (
                  <td>
                    {member.type === 'user' && member.id !== currentUserId && (
                      <div className="user-actions">
                        <button
                          type="button"
                          className="inventory-table__menu-button"
                          onClick={(e) => toggleMenu(member.id, e)}
                          disabled={deletingId === member.id}
                          aria-label="Actions"
                          ref={(el) => {
                            if (el) {
                              buttonRefs.current.set(member.id, el)
                            } else {
                              buttonRefs.current.delete(member.id)
                            }
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="10" cy="4" r="2" />
                            <circle cx="10" cy="10" r="2" />
                            <circle cx="10" cy="16" r="2" />
                          </svg>
                        </button>
                        {openMenuId === member.id && menuPosition && (
                          <div 
                            className="dropdown-menu"
                            ref={(el) => {
                              if (el) {
                                menuRefs.current.set(member.id, el)
                              } else {
                                menuRefs.current.delete(member.id)
                              }
                            }}
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`,
                            }}
                          >
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleMenuAction('edit', member)}
                            >
                              {t.team.table.editRole}
                            </button>
                            {member.isActive && (
                              <button
                                type="button"
                                className="dropdown-item dropdown-item--danger"
                                onClick={() => handleMenuAction('deactivate', member)}
                                disabled={deletingId === member.id}
                              >
                                {t.team.table.deactivate}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {member.type === 'invitation' && (
                      <div className="user-actions">
                        <button
                          type="button"
                          className="inventory-table__menu-button"
                          onClick={(e) => toggleMenu(member.id, e)}
                          disabled={resendingId === member.invitationId}
                          aria-label="Actions"
                          ref={(el) => {
                            if (el) {
                              buttonRefs.current.set(member.id, el)
                            } else {
                              buttonRefs.current.delete(member.id)
                            }
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="10" cy="4" r="2" />
                            <circle cx="10" cy="10" r="2" />
                            <circle cx="10" cy="16" r="2" />
                          </svg>
                        </button>
                        {openMenuId === member.id && menuPosition && (
                          <div 
                            className="dropdown-menu"
                            ref={(el) => {
                              if (el) {
                                menuRefs.current.set(member.id, el)
                              } else {
                                menuRefs.current.delete(member.id)
                              }
                            }}
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`,
                            }}
                          >
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleMenuAction('resend', member)}
                              disabled={resendingId === member.invitationId}
                            >
                              {resendingId === member.invitationId ? t.team.table.resending : t.team.table.resendInvitation}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="inventory-modal" onClick={handleCancelEdit}>
          <div 
            className="inventory-modal__content user-modal-content modal-content--small" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inventory-modal__header user-modal-header">
              <h2 className="inventory-modal__title user-modal-title">{t.team.editRole.title}</h2>
              <button
                className="inventory-modal__close"
                onClick={handleCancelEdit}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="inventory-modal__body user-modal-body">
              <div className="user-info-section">
                <p className="user-info-name">
                  <strong>{t.team.editRole.user}:</strong> {editingUser.name || editingUser.email}
                </p>
                <p className="user-info-email">
                  {editingUser.email}
                </p>
              </div>
              <div className="form-field">
                <label htmlFor="role" className="form-label">
                  {t.team.role}
                </label>
                <select
                  id="role"
                  value={editingRole}
                  onChange={(e) => setEditingRole(e.target.value)}
                  className="form-select user-role-select"
                  disabled={saving}
                >
                  <option value="VIEWER">{t.team.roles.viewer}</option>
                  <option value="TECHNICIAN">{t.team.roles.technician}</option>
                  <option value="MANAGER">{t.team.roles.manager}</option>
                  <option value="ADMIN">{t.team.roles.admin}</option>
                </select>
                <p className="form-hint">
                  {editingRole === 'ADMIN' && t.team.roleDescriptions.admin}
                  {editingRole === 'MANAGER' && t.team.roleDescriptions.manager}
                  {editingRole === 'TECHNICIAN' && t.team.roleDescriptions.technician}
                  {editingRole === 'VIEWER' && t.team.roleDescriptions.viewer}
                </p>
              </div>
              <div className="form-actions user-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  {t.common.actions.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveRole}
                  disabled={saving}
                >
                  {saving ? t.team.editRole.saving : t.team.editRole.saveChanges}
                </button>
              </div>
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

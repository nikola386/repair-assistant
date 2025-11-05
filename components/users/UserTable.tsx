'use client'

import { useState, useEffect, useRef } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  profileImage: string | null
  createdAt: Date
  invitedBy: string | null
}

interface UserTableProps {
  users: User[]
  canEdit: boolean
  currentUserId?: string
  onUpdate: () => void
}

export default function UserTable({ users, canEdit, currentUserId, onUpdate }: UserTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingRole, setEditingRole] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const handleEditRole = (user: User) => {
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
        alert(error.error || 'Failed to update user')
        return
      }

      setEditingUser(null)
      setEditingRole('')
      onUpdate()
    } catch (error) {
      alert('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setEditingRole('')
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to deactivate user')
        return
      }

      setDeletingId(null)
      onUpdate()
    } catch (error) {
      alert('Failed to deactivate user')
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

  const handleMenuAction = (action: string, user: User) => {
    setOpenMenuId(null)
    setMenuPosition(null)
    
    if (action === 'edit') {
      handleEditRole(user)
    } else if (action === 'deactivate') {
      handleDeactivate(user.id)
    }
  }

  const roleDisplay = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    TECHNICIAN: 'Technician',
    VIEWER: 'Viewer',
  }

  const roleColors = {
    ADMIN: '#dc3545',
    MANAGER: '#007bff',
    TECHNICIAN: '#28a745',
    VIEWER: '#6c757d',
  }

  if (users.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        No users found. Invite team members to get started.
      </div>
    )
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Joined</th>
              {canEdit && <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px' }}>
                  {user.name || '—'}
                </td>
                <td style={{ padding: '12px' }}>
                  {user.email}
                </td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      background: roleColors[user.role as keyof typeof roleColors] || '#6c757d',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {roleDisplay[user.role as keyof typeof roleDisplay] || user.role}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      background: user.isActive ? '#28a745' : '#dc3545',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px', color: '#666' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                {canEdit && (
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {user.id !== currentUserId && (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          className="inventory-table__menu-button"
                          onClick={(e) => toggleMenu(user.id, e)}
                          disabled={deletingId === user.id}
                          aria-label="Actions"
                          ref={(el) => {
                            if (el) {
                              buttonRefs.current.set(user.id, el)
                            } else {
                              buttonRefs.current.delete(user.id)
                            }
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="10" cy="4" r="2" />
                            <circle cx="10" cy="10" r="2" />
                            <circle cx="10" cy="16" r="2" />
                          </svg>
                        </button>
                        {openMenuId === user.id && menuPosition && (
                          <div 
                            className="inventory-table__menu-dropdown"
                            ref={(el) => {
                              if (el) {
                                menuRefs.current.set(user.id, el)
                              } else {
                                menuRefs.current.delete(user.id)
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
                              onClick={() => handleMenuAction('edit', user)}
                            >
                              Edit Role
                            </button>
                            {user.isActive && (
                              <button
                                type="button"
                                className="inventory-table__menu-item inventory-table__menu-item--danger"
                                onClick={() => handleMenuAction('deactivate', user)}
                                disabled={deletingId === user.id}
                              >
                                Deactivate
                              </button>
                            )}
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
            className="inventory-modal__content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px' }}
          >
            <div className="inventory-modal__header" style={{ padding: '16px 20px' }}>
              <h2 className="inventory-modal__title" style={{ fontSize: '1.25rem' }}>Edit User Role</h2>
              <button
                className="inventory-modal__close"
                onClick={handleCancelEdit}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="inventory-modal__body" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
                  <strong>User:</strong> {editingUser.name || editingUser.email}
                </p>
                <p style={{ marginBottom: '0', color: '#666', fontSize: '13px' }}>
                  {editingUser.email}
                </p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="role" style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Role
                </label>
                <select
                  id="role"
                  value={editingRole}
                  onChange={(e) => setEditingRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  disabled={saving}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
                  {editingRole === 'ADMIN' && 'Full access except cannot delete users'}
                  {editingRole === 'MANAGER' && 'Can manage tickets, customers, inventory, and reports'}
                  {editingRole === 'TECHNICIAN' && 'Can view and edit tickets, create customers'}
                  {editingRole === 'VIEWER' && 'Read-only access to tickets, customers, inventory, and reports'}
                </p>
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                justifyContent: 'flex-end', 
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #dee2e6'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveRole}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

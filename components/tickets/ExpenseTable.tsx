'use client'

import { useState, useEffect, useRef } from 'react'
import { Expense } from '../../types/ticket'
import { InventoryItem } from '../../types/inventory'
import { showAlert } from '../../lib/alerts'
import { useLanguage } from '../../contexts/LanguageContext'
import ConfirmationModal from '../ui/ConfirmationModal'
import { useConfirmation } from '../../lib/useConfirmation'

interface ExpenseTableProps {
  ticketId: string
  initialExpenses?: Expense[]
  onExpensesChange?: (expenses: Expense[]) => void
  editable?: boolean
  showHeader?: boolean
  triggerAdd?: boolean
  onAddTriggered?: () => void
}

export default function ExpenseTable({ ticketId, initialExpenses = [], onExpensesChange, editable = true, showHeader = true, triggerAdd = false, onAddTriggered }: ExpenseTableProps) {
  const { t } = useLanguage()
  const confirmation = useConfirmation()
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(false)
  const [inventorySearchQuery, setInventorySearchQuery] = useState('')
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false)
  const [filteredInventoryItems, setFilteredInventoryItems] = useState<InventoryItem[]>([])
  const inventorySearchRef = useRef<HTMLInputElement>(null)
  const inventoryDropdownRef = useRef<HTMLDivElement>(null)
  
  // Handle external trigger to add expense
  useEffect(() => {
    if (triggerAdd && editable && !isAdding) {
      setIsAdding(true)
      if (onAddTriggered) {
        onAddTriggered()
      }
    }
  }, [triggerAdd, editable, isAdding, onAddTriggered])
  
  const [newExpense, setNewExpense] = useState({
    inventoryItemId: '',
    name: '',
    quantity: '',
    price: '',
  })
  
  // Fetch inventory items on mount
  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        setIsLoadingInventory(true)
        const response = await fetch('/api/inventory?limit=1000')
        if (response.ok) {
          const data = await response.json()
          setInventoryItems(data.items || [])
        }
      } catch (error) {
        console.error('Error fetching inventory items:', error)
      } finally {
        setIsLoadingInventory(false)
      }
    }
    
    if (editable) {
      fetchInventoryItems()
    }
  }, [editable])

  const [editingExpense, setEditingExpense] = useState({
    name: '',
    quantity: '',
    price: '',
  })

  useEffect(() => {
    setExpenses(initialExpenses)
  }, [initialExpenses])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tickets/${ticketId}/expenses`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        if (onExpensesChange) {
          onExpensesChange(data.expenses || [])
        }
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter inventory items based on search query
  useEffect(() => {
    if (!inventorySearchQuery.trim()) {
      setFilteredInventoryItems([])
      setShowInventoryDropdown(false)
      return
    }

    const query = inventorySearchQuery.toLowerCase()
    const filtered = inventoryItems
      .filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query)
        const skuMatch = item.sku?.toLowerCase().includes(query)
        return nameMatch || skuMatch
      })
      .slice(0, 20) // Limit to 20 results for performance

    setFilteredInventoryItems(filtered)
    setShowInventoryDropdown(filtered.length > 0)
  }, [inventorySearchQuery, inventoryItems])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inventoryDropdownRef.current &&
        !inventoryDropdownRef.current.contains(event.target as Node) &&
        inventorySearchRef.current &&
        !inventorySearchRef.current.contains(event.target as Node)
      ) {
        setShowInventoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInventoryItemSelect = (item: InventoryItem) => {
    setNewExpense({
      inventoryItemId: item.id,
      name: item.name,
      quantity: '',
      price: item.unitPrice?.toString() || item.costPrice?.toString() || '',
    })
    setInventorySearchQuery('')
    setShowInventoryDropdown(false)
    setFilteredInventoryItems([])
  }

  const handleInventoryItemChange = (inventoryItemId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === inventoryItemId)
    if (selectedItem) {
      setNewExpense({
        inventoryItemId: selectedItem.id,
        name: selectedItem.name,
        quantity: '',
        price: selectedItem.unitPrice?.toString() || selectedItem.costPrice?.toString() || '',
      })
    } else {
      setNewExpense({ ...newExpense, inventoryItemId: '' })
    }
  }

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.quantity || !newExpense.price) {
      showAlert.error(t.common.messages.required)
      return
    }

    const quantity = parseFloat(newExpense.quantity)
    const price = parseFloat(newExpense.price)

    if (isNaN(quantity) || quantity < 0 || isNaN(price) || price < 0) {
      showAlert.error(t.common.messages.invalidNumbers)
      return
    }

    // If inventory item is selected, verify quantity is available
    if (newExpense.inventoryItemId) {
      const selectedItem = inventoryItems.find(item => item.id === newExpense.inventoryItemId)
      if (selectedItem && selectedItem.currentQuantity < quantity) {
        showAlert.error(t.tickets.expenses.insufficientInventory.replace('{available}', selectedItem.currentQuantity.toString()).replace('{required}', quantity.toString()))
        return
      }
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/tickets/${ticketId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: newExpense.inventoryItemId || undefined,
          name: newExpense.name,
          quantity: quantity,
          price: price,
        }),
      })

      if (response.ok) {
        await fetchExpenses()
        // Refresh inventory items to reflect updated quantities
        const inventoryResponse = await fetch('/api/inventory?limit=1000')
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json()
          setInventoryItems(inventoryData.items || [])
        }
        setNewExpense({ inventoryItemId: '', name: '', quantity: '', price: '' })
        setInventorySearchQuery('')
        setShowInventoryDropdown(false)
        setFilteredInventoryItems([])
        setIsAdding(false)
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.tickets.expenses.addError)
      }
    } catch (error) {
      console.error('Error adding expense:', error)
      showAlert.error(t.tickets.expenses.addError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingId(expense.id)
    setEditingExpense({
      name: expense.name,
      quantity: expense.quantity.toString(),
      price: expense.price.toString(),
    })
  }

  const handleUpdateExpense = async (expenseId: string) => {
    if (!editingExpense.name || !editingExpense.quantity || !editingExpense.price) {
      showAlert.error(t.common.messages.required)
      return
    }

    const quantity = parseFloat(editingExpense.quantity)
    const price = parseFloat(editingExpense.price)

    if (isNaN(quantity) || quantity < 0 || isNaN(price) || price < 0) {
      showAlert.error(t.common.messages.invalidNumbers)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/tickets/${ticketId}/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingExpense.name,
          quantity: quantity,
          price: price,
        }),
      })

      if (response.ok) {
        await fetchExpenses()
        setEditingId(null)
        setEditingExpense({ name: '', quantity: '', price: '' })
      } else {
        const error = await response.json()
        showAlert.error(error.error || t.tickets.expenses.updateError)
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      showAlert.error(t.tickets.expenses.updateError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await confirmation.confirm({
      message: t.common.messages.confirmDelete,
      variant: 'danger',
      confirmText: t.common.actions.delete,
      cancelText: t.common.actions.cancel,
    })

    if (!confirmed) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/tickets/${ticketId}/expenses/${expenseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchExpenses()
      } else {
        showAlert.error(t.tickets.expenses.deleteError)
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      showAlert.error(t.tickets.expenses.deleteError)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelAdd = () => {
    setIsAdding(false)
    setNewExpense({ inventoryItemId: '', name: '', quantity: '', price: '' })
    setInventorySearchQuery('')
    setShowInventoryDropdown(false)
    setFilteredInventoryItems([])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingExpense({ name: '', quantity: '', price: '' })
  }

  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + expense.quantity * expense.price
  }, 0)

  return (
    <div className="expense-table">
      {showHeader && (
        <div className="expense-table__header">
          <h3>{t.tickets.expenses.title}</h3>
          {editable && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsAdding(true)}
              disabled={isAdding || isLoading}
            >
              {t.tickets.expenses.addExpense}
            </button>
          )}
        </div>
      )}

      <div className="expense-table__content">
        {isAdding && editable && (
          <div className="expense-table__add-form">
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <input
                ref={inventorySearchRef}
                type="text"
                placeholder={t.tickets.expenses.searchInventoryPlaceholder}
                value={inventorySearchQuery}
                onChange={(e) => setInventorySearchQuery(e.target.value)}
                onFocus={() => {
                  if (filteredInventoryItems.length > 0) {
                    setShowInventoryDropdown(true)
                  }
                }}
                className="expense-table__input"
                style={{ width: '100%' }}
              />
              {showInventoryDropdown && filteredInventoryItems.length > 0 && (
                <div
                  ref={inventoryDropdownRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    marginTop: '4px',
                  }}
                >
                  {filteredInventoryItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleInventoryItemSelect(item)}
                      style={{
                        padding: '10px 15px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                      }}
                    >
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                        {item.name}
                        {item.sku && <span style={{ color: '#666', marginLeft: '8px' }}>({item.sku})</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Qty: {item.currentQuantity}
                        {item.unitPrice && ` • Price: $${item.unitPrice.toFixed(2)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {inventorySearchQuery && filteredInventoryItems.length === 0 && !isLoadingInventory && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '10px 15px',
                  marginTop: '4px',
                  fontSize: '14px',
                  color: '#666',
                  zIndex: 1000,
                }}>
                      {t.common.messages.noItemsFound}
                </div>
              )}
            </div>
            <div className="expense-table__form-row">
              <input
                type="text"
                placeholder={t.tickets.expenses.expenseName}
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                className="expense-table__input"
              />
              <input
                type="number"
                placeholder={t.common.fields.quantity}
                min="0"
                step="1"
                value={newExpense.quantity}
                onChange={(e) => setNewExpense({ ...newExpense, quantity: e.target.value })}
                className="expense-table__input"
              />
              <input
                type="number"
                placeholder={t.common.fields.price}
                min="0"
                step="0.01"
                value={newExpense.price}
                onChange={(e) => setNewExpense({ ...newExpense, price: e.target.value })}
                className="expense-table__input"
              />
              <div className="expense-table__form-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddExpense}
                  disabled={isLoading || isLoadingInventory}
                >
                  {t.common.actions.save}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={cancelAdd}
                  disabled={isLoading}
                >
                  {t.common.actions.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {expenses.length === 0 && !isAdding ? (
          <p className="expense-table__empty">{t.tickets.expenses.noExpenses}</p>
        ) : (
            <table className="expense-table__table">
              <thead>
                <tr>
                  <th>{t.common.fields.name}</th>
                  <th>{t.common.fields.quantity}</th>
                  <th>{t.common.fields.price}</th>
                  <th>{t.common.fields.total}</th>
                  {editable && <th>{t.common.labels.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    {editingId === expense.id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={editingExpense.name}
                            onChange={(e) => setEditingExpense({ ...editingExpense, name: e.target.value })}
                            className="expense-table__table__edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editingExpense.quantity}
                            onChange={(e) => setEditingExpense({ ...editingExpense, quantity: e.target.value })}
                            className="expense-table__table__edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingExpense.price}
                            onChange={(e) => setEditingExpense({ ...editingExpense, price: e.target.value })}
                            className="expense-table__table__edit-input"
                          />
                        </td>
                        <td>${((parseFloat(editingExpense.quantity) || 0) * (parseFloat(editingExpense.price) || 0)).toFixed(2)}</td>
                        <td>
                          <div className="expense-table__table__edit-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              onClick={() => handleUpdateExpense(expense.id)}
                              disabled={isLoading}
                            >
                              {t.common.actions.save}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={cancelEdit}
                              disabled={isLoading}
                            >
                              {t.common.actions.cancel}
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{expense.name}</td>
                        <td>{expense.quantity}</td>
                        <td>${expense.price.toFixed(2)}</td>
                        <td>${(expense.quantity * expense.price).toFixed(2)}</td>
                        {editable && (
                          <td>
                            <div className="expense-table__table__actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                              onClick={() => handleEditExpense(expense)}
                              disabled={isLoading || editingId !== null}
                            >
                              {t.common.actions.edit}
                            </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-xs"
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={isLoading || editingId !== null}
                              >
                                {t.common.actions.delete}
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
                {expenses.length > 0 && (
                  <tr className="expense-table__table__total-row">
                    <td colSpan={editable ? 4 : 3} className="expense-table__table__total-label">
                      <strong>{t.tickets.expenses.totalExpenses}</strong>
                    </td>
                    <td className="expense-table__table__total-amount">
                      <strong>${totalExpenses.toFixed(2)}</strong>
                    </td>
                    {editable && <td></td>}
                  </tr>
                )}
              </tbody>
            </table>
        )}
      </div>

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
    </div>
  )
}


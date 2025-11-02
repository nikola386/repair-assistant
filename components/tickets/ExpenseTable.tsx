'use client'

import { useState, useEffect } from 'react'
import { Expense } from '../../types/ticket'
import { showAlert } from '../../lib/alerts'

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
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
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
    name: '',
    quantity: '',
    price: '',
  })

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

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.quantity || !newExpense.price) {
      showAlert.error('Please fill in all fields')
      return
    }

    const quantity = parseFloat(newExpense.quantity)
    const price = parseFloat(newExpense.price)

    if (isNaN(quantity) || quantity < 0 || isNaN(price) || price < 0) {
      showAlert.error('Quantity and price must be valid positive numbers')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/tickets/${ticketId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExpense.name,
          quantity: quantity,
          price: price,
        }),
      })

      if (response.ok) {
        await fetchExpenses()
        setNewExpense({ name: '', quantity: '', price: '' })
        setIsAdding(false)
      } else {
        const error = await response.json()
        showAlert.error(error.error || 'Failed to add expense')
      }
    } catch (error) {
      console.error('Error adding expense:', error)
      showAlert.error('Failed to add expense')
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
      showAlert.error('Please fill in all fields')
      return
    }

    const quantity = parseFloat(editingExpense.quantity)
    const price = parseFloat(editingExpense.price)

    if (isNaN(quantity) || quantity < 0 || isNaN(price) || price < 0) {
      showAlert.error('Quantity and price must be valid positive numbers')
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
        showAlert.error(error.error || 'Failed to update expense')
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      showAlert.error('Failed to update expense')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/tickets/${ticketId}/expenses/${expenseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchExpenses()
      } else {
        showAlert.error('Failed to delete expense')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      showAlert.error('Failed to delete expense')
    } finally {
      setIsLoading(false)
    }
  }

  const cancelAdd = () => {
    setIsAdding(false)
    setNewExpense({ name: '', quantity: '', price: '' })
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
          <h3>Expenses</h3>
          {editable && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsAdding(true)}
              disabled={isAdding || isLoading}
            >
              Add Expense
            </button>
          )}
        </div>
      )}

      <div className="expense-table__content">
        {isAdding && editable && (
          <div className="expense-table__add-form">
            <div className="expense-table__form-row">
              <input
                type="text"
                placeholder="Expense name"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                className="expense-table__input"
              />
              <input
                type="number"
                placeholder="Quantity"
                min="0"
                step="0.01"
                value={newExpense.quantity}
                onChange={(e) => setNewExpense({ ...newExpense, quantity: e.target.value })}
                className="expense-table__input"
              />
              <input
                type="number"
                placeholder="Price"
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
                  disabled={isLoading}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={cancelAdd}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {expenses.length === 0 && !isAdding ? (
          <p className="expense-table__empty">No expenses added yet</p>
        ) : (
            <table className="expense-table__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                  {editable && <th>Actions</th>}
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
                            step="0.01"
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
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={cancelEdit}
                              disabled={isLoading}
                            >
                              Cancel
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
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-xs"
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={isLoading || editingId !== null}
                              >
                                Delete
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
                      <strong>Total Expenses</strong>
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
    </div>
  )
}


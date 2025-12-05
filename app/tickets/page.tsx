'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TicketList from '@/components/tickets/TicketList'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import TicketForm from '@/components/tickets/TicketForm'
import { CreateTicketInput } from '@/types/ticket'
import { showAlert } from '@/lib/alerts'

export default function TicketsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false)
      }
    }

    if (showForm) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [showForm])

  const handleCreateTicket = async (formData: CreateTicketInput) => {
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        showAlert.success('Ticket created successfully')
        
        // Refresh the ticket list
        setRefreshTrigger(prev => prev + 1)
        
        // Close modal
        setShowForm(false)
        
        // Redirect to the newly created ticket detail page
        if (data.ticket?.id) {
          router.push(`/tickets/${data.ticket.id}`)
        }
        
        return data.ticket?.id // Return ticket ID for potential image uploads
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      throw error
    }
  }

  return (
    <>
      <Navigation />
      <main className="tickets-page">
        <div className="container">
          <div className="tickets-page__header">
            <h1>{t.tickets.title}</h1>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowForm(true)}
            >
              {t.tickets.createNew}
            </button>
          </div>

          <TicketList refreshTrigger={refreshTrigger} />
        </div>
      </main>

      {/* Create Ticket Modal */}
      {showForm && (
        <div 
          className="ticket-modal" 
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-ticket-modal-title"
        >
          <div className="ticket-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal__header">
              <h2 id="create-ticket-modal-title" className="ticket-modal__title">
                {t.tickets.form.title || t.tickets.createNew}
              </h2>
              <button
                className="ticket-modal__close"
                onClick={() => setShowForm(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="ticket-modal__body">
              <TicketForm
                onSubmit={handleCreateTicket}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}


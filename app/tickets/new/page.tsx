'use client'

import { useRouter } from 'next/navigation'
import { CreateTicketInput } from '@/types/ticket'
import TicketForm from '@/components/tickets/TicketForm'
import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function NewTicketPage() {
  const { t } = useLanguage()
  const router = useRouter()

  const handleCreateTicket = async (formData: CreateTicketInput) => {
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to the newly created ticket detail page
        if (data.ticket?.id) {
          router.push(`/tickets/${data.ticket.id}`)
        } else {
          // Fallback to tickets list if no ID is returned
          router.push('/tickets')
        }
        return data.ticket?.id // Return ticket ID for potential image uploads
      } else {
        throw new Error('Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/tickets')
  }

  return (
    <>
      <Navigation />
      <main className="tickets-page">
        <div className="container">
          <div className="tickets-page__header">
            <h1>{t.tickets.form.title}</h1>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCancel}
            >
              {t.tickets.backToList}
            </button>
          </div>

          <div className="tickets-page__form-section">
            <TicketForm
              onSubmit={handleCreateTicket}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </main>
    </>
  )
}

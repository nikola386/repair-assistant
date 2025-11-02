'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TicketDetail from '@/components/tickets/TicketDetail'
import Navigation from '@/components/layout/Navigation'
import Spinner from '@/components/ui/Spinner'
import { RepairTicket } from '@/types/ticket'

interface PageProps {
  params: {
    id: string
  }
}

export default function TicketDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [ticket, setTicket] = useState<RepairTicket | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTicket = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/tickets/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setTicket(data.ticket)
        } else if (response.status === 404) {
          router.push('/tickets')
        }
      } catch (error) {
        console.error('Error fetching ticket:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTicket()
  }, [params.id, router])

  const handleTicketUpdate = (updatedTicket: RepairTicket) => {
    setTicket(updatedTicket)
  }

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="container">
          <div className="spinner-container spinner-container--inline">
            <Spinner size="large" />
            <p>Loading ticket...</p>
          </div>
        </div>
      </>
    )
  }

  if (!ticket) {
    return (
      <>
        <Navigation />
        <div className="container">
          <div style={{ padding: '2rem', textAlign: 'center' }}>Ticket not found</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <main className="tickets-page">
        <div className="container">
          <TicketDetail ticket={ticket} onTicketUpdate={handleTicketUpdate} />
        </div>
      </main>
    </>
  )
}


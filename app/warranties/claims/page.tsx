'use client'

import { useState, useEffect } from 'react'
import { WarrantyClaim } from '@/types/warranty'
import Navigation from '@/components/layout/Navigation'
import Spinner from '@/components/ui/Spinner'
import { useLanguage } from '@/contexts/LanguageContext'

export default function WarrantyClaimsPage() {
  const { t } = useLanguage()
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchClaims()
  }, [statusFilter])

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const url = statusFilter === 'all' 
        ? '/api/warranties/claims'
        : `/api/warranties/claims?status=${statusFilter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setClaims(data.claims || [])
      }
    } catch (error) {
      console.error('Error fetching warranty claims:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusClass = (status: string) => {
    return `warranty-claim-status warranty-claim-status--${status}`
  }

  return (
    <>
      <Navigation />
      <main className="warranty-claims-page">
        <div className="container">
          <div className="warranty-claims-page__header">
            <h1>{t.warranties.claim.title}</h1>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="warranty-claims-page__filter"
            >
              <option value="all">{t.warranties.filter.allStatuses}</option>
              <option value="pending">{t.warranties.claim.status.pending}</option>
              <option value="approved">{t.warranties.claim.status.approved}</option>
              <option value="rejected">{t.warranties.claim.status.rejected}</option>
              <option value="completed">{t.warranties.claim.status.completed}</option>
            </select>
          </div>

          {loading ? (
            <div className="spinner-container">
              <Spinner />
            </div>
          ) : claims.length === 0 ? (
            <div className="warranty-claims-page__empty">
              <p>{t.warranties.claim.noClaimsFound}</p>
            </div>
          ) : (
            <div className="warranty-claims-page__list">
              <table className="warranty-claims-table">
                <thead>
                  <tr>
                    <th>{t.warranties.claim.claimDate}</th>
                    <th>{t.warranties.claim.warranty}</th>
                    <th>{t.warranties.claim.issueDescription}</th>
                    <th>{t.warranties.table.status}</th>
                    <th>{t.warranties.claim.resolution}</th>
                    <th>{t.warranties.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id}>
                      <td>{formatDate(claim.claimDate)}</td>
                      <td>
                        <span>{t.warranties.claim.warrantyId} {claim.warrantyId}</span>
                      </td>
                      <td>{claim.issueDescription.substring(0, 100)}...</td>
                      <td>
                        <span className={getStatusClass(claim.status)}>
                          {t.warranties.claim.status[claim.status as keyof typeof t.warranties.claim.status] || claim.status}
                        </span>
                      </td>
                      <td>
                        {claim.resolutionNotes ? (
                          <span title={claim.resolutionNotes}>
                            {claim.resolutionNotes.substring(0, 50)}...
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        -
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  )
}


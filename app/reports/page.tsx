'use client'

import Navigation from '@/components/layout/Navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ReportsPage() {
  const { t } = useLanguage()

  return (
    <>
      <Navigation />
      <main className="reports-page">
        <div className="container">
          <div className="reports-page__header">
            <h1>{t.reports?.title || 'Reports'}</h1>
          </div>
          <div className="reports-page__content">
            <p>{t.reports?.description || 'Reports coming soon...'}</p>
          </div>
        </div>
      </main>
    </>
  )
}


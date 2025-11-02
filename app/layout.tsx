import type { Metadata } from 'next'
import '../styles/globals.scss'
import 'leaflet/dist/leaflet.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import CookieBanner from '@/components/ui/CookieBanner'
import { Providers } from './providers'
import ProtectedRoutes from '@/components/ProtectedRoutes'

export const metadata: Metadata = {
  title: 'Dashboard - Майстор Жичко',
  description: 'Repair management dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LanguageProvider>
            <ProtectedRoutes>
              {children}
            </ProtectedRoutes>
            <CookieBanner />
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  )
}


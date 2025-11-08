import type { Metadata } from 'next'
import '../styles/globals.scss'
import 'leaflet/dist/leaflet.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import CookieBanner from '@/components/ui/CookieBanner'
import { Providers } from './providers'
import ProtectedRoutes from '@/components/ProtectedRoutes'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'Repair Assistant - Streamline Your Electronics Repair Business',
  description: 'A comprehensive repair management system built specifically for electronics repair businesses. Eliminate the chaos of spreadsheets and disconnected systems with a single, powerful platform.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
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
            <Toaster 
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Analytics />
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  )
}


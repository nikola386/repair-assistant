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
  keywords: ['repair management', 'electronics repair', 'repair shop software', 'ticket management', 'repair business', 'customer management', 'inventory tracking', 'repair shop'],
  authors: [{ name: 'Repair Assistant' }],
  creator: 'Repair Assistant',
  publisher: 'Repair Assistant',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://app.maistor-zhicko.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Repair Assistant - Streamline Your Electronics Repair Business',
    description: 'A comprehensive repair management system built specifically for electronics repair businesses. Eliminate the chaos of spreadsheets and disconnected systems with a single, powerful platform.',
    url: '/',
    siteName: 'Repair Assistant',
    images: [
      {
        url: '/screenshots/dashboard.png',
        width: 1200,
        height: 800,
        alt: 'Repair Assistant Dashboard - Real-time statistics and business analytics',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Repair Assistant - Streamline Your Electronics Repair Business',
    description: 'A comprehensive repair management system built specifically for electronics repair businesses.',
    images: ['/screenshots/dashboard.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', sizes: 'any' },
    ],
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


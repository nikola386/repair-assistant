'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Spinner from './ui/Spinner'

/**
 * Client-side component that checks onboarding status for protected routes
 * Wraps all protected routes and redirects to onboarding if not complete
 */
export default function ProtectedRoutes({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  // Routes that don't require onboarding check
  const publicRoutes = ['/login', '/register', '/onboarding']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    // Don't check onboarding on public routes
    if (isPublicRoute) {
      setChecking(false)
      return
    }

    // Wait for session to load
    if (status === 'loading') {
      return
    }

    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    // Check onboarding status if authenticated
    if (status === 'authenticated' && session) {
      fetch('/api/onboarding')
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch onboarding status')
          }
          return res.json()
        })
        .then((data) => {
          if (!data.isComplete) {
            // Redirect to onboarding if not complete
            router.push('/onboarding')
          } else {
            setChecking(false)
          }
        })
        .catch((err) => {
          console.error('Error checking onboarding status:', err)
          // On error, redirect to onboarding to be safe
          router.push('/onboarding')
        })
    }
  }, [status, session, router, pathname, isPublicRoute])

  // Don't render guard on public routes
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Show loading while checking
  if (status === 'loading' || checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner />
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null
  }

  return <>{children}</>
}


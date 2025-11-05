'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Spinner from './ui/Spinner'
import { Permission } from '@/lib/permissions'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: Permission
  requireActive?: boolean
}

/**
 * Client-side component that checks onboarding status and permissions for protected routes
 * Wraps all protected routes and redirects to onboarding if not complete
 * Optionally checks permissions if provided
 */
export default function ProtectedRoutes({ 
  children,
  permission,
  requireActive = true 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [hasPermission, setHasPermission] = useState(false)
  const hasCheckedOnboarding = useRef(false)

  // Routes that don't require onboarding check
  const publicRoutes = ['/login', '/register', '/onboarding', '/verify-email', '/accept-invitation']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  useEffect(() => {
    // Reset check flag when user logs out
    if (status === 'unauthenticated') {
      hasCheckedOnboarding.current = false
      setOnboardingComplete(null)
    }

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
    // Only check once when session becomes authenticated, not on every route change
    if (status === 'authenticated' && session && !hasCheckedOnboarding.current) {
      hasCheckedOnboarding.current = true
      
      // Check if user is active
      if (requireActive) {
        fetch('/api/users/me')
          .then(res => res.json())
          .then(user => {
            if (!user.isActive) {
              router.push('/login?error=inactive')
              setChecking(false)
              return
            }
          })
          .catch(err => {
            console.error('Error checking user status:', err)
          })
      }

      // Check onboarding status
      fetch('/api/onboarding')
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch onboarding status')
          }
          return res.json()
        })
        .then((data) => {
          setOnboardingComplete(data.isComplete)
          if (!data.isComplete) {
            // Redirect to onboarding if not complete
            router.push('/onboarding')
            setChecking(false)
          } else {
            // Check permission if provided
            if (permission) {
              fetch(`/api/users/permissions?permission=${permission}`)
                .then(res => res.json())
                .then(data => {
                  if (!data.hasPermission) {
                    router.push('/dashboard?error=unauthorized')
                    setChecking(false)
                    return
                  }
                  setHasPermission(true)
                  setChecking(false)
                })
                .catch(err => {
                  console.error('Error checking permission:', err)
                  router.push('/dashboard?error=unauthorized')
                  setChecking(false)
                })
            } else {
              setHasPermission(true)
              setChecking(false)
            }
          }
        })
        .catch((err) => {
          console.error('Error checking onboarding status:', err)
          // On error, redirect to onboarding to be safe
          router.push('/onboarding')
          setChecking(false)
        })
    } else if (status === 'authenticated' && session && onboardingComplete === true) {
      // If we've already checked and onboarding is complete
      if (permission && !hasPermission) {
        // Re-check permission
        fetch(`/api/users/permissions?permission=${permission}`)
          .then(res => res.json())
          .then(data => {
            if (!data.hasPermission) {
              router.push('/dashboard?error=unauthorized')
              return
            }
            setHasPermission(true)
            setChecking(false)
          })
          .catch(err => {
            console.error('Error checking permission:', err)
            router.push('/dashboard?error=unauthorized')
            setChecking(false)
          })
      } else {
        setChecking(false)
      }
    }
  }, [status, session, router, onboardingComplete, isPublicRoute, permission, requireActive, hasPermission])

  // Don't render guard on public routes
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Show loading while checking
  if (status === 'loading' || checking) {
    return (
      <div className="loading-container">
        <Spinner />
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null
  }

  // Don't render if permission required but not granted
  if (permission && !hasPermission && !checking) {
    return null
  }

  return <>{children}</>
}


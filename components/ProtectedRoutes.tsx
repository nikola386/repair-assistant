'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Spinner from './ui/Spinner'
import { Permission } from '@/lib/permissions'
import { checkPermission } from '@/lib/permissionsCache'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: Permission
  requireActive?: boolean
}

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

  const publicRoutes = ['/', '/login', '/register', '/onboarding', '/verify-email', '/accept-invitation']
  const isPublicRoute = pathname === '/' || publicRoutes.some(route => route !== '/' && pathname?.startsWith(route))

  useEffect(() => {
    if (status === 'unauthenticated') {
      hasCheckedOnboarding.current = false
      setOnboardingComplete(null)
    }

    if (isPublicRoute) {
      setChecking(false)
      return
    }

    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session && !hasCheckedOnboarding.current) {
      hasCheckedOnboarding.current = true
      
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
            router.push('/onboarding')
            setChecking(false)
          } else {
            if (permission && session.user.id) {
              checkPermission(session.user.id, permission)
                .then(hasPermission => {
                  if (!hasPermission) {
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
          router.push('/onboarding')
          setChecking(false)
        })
    } else if (status === 'authenticated' && session && onboardingComplete === true) {
      if (permission && !hasPermission && session.user.id) {
        checkPermission(session.user.id, permission)
          .then(hasPermission => {
            if (!hasPermission) {
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

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (status === 'loading' || checking) {
    return (
      <div className="loading-container">
        <Spinner />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (permission && !hasPermission && !checking) {
    return null
  }

  return <>{children}</>
}


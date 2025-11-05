'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ProfileDropdown from '../ui/ProfileDropdown'
import { Permission } from '@/lib/permissions'

export default function Navigation() {
  const { t } = useLanguage()
  const [navMenuActive, setNavMenuActive] = useState(false)
  const [navbarBg, setNavbarBg] = useState('rgba(30, 30, 30, 0.98)')
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set())

  // Navbar background on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setNavbarBg('rgba(30, 30, 30, 0.99)')
      } else {
        setNavbarBg('rgba(30, 30, 30, 0.98)')
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Handle navigation links with smooth scrolling
  useEffect(() => {
    const handleNavClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement
      
      if (anchor && anchor.closest('.nav-menu')) {
        e.preventDefault()
        const targetId = anchor.getAttribute('href')
        if (targetId) {
          // If we're not on the home page, navigate there first
          if (pathname !== '/') {
            router.push(`/${targetId}`)
            // The scroll will be handled by the hash navigation handler in Home component
          } else {
            // We're on home page, just scroll
            const element = document.querySelector(targetId)
            if (element) {
              const headerOffset = 80
              const elementPosition = element.getBoundingClientRect().top
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              })
              // Close mobile menu if open
              setNavMenuActive(false)
            }
          }
        }
      }
    }

    // Use event delegation on document
    document.addEventListener('click', handleNavClick)

    return () => {
      document.removeEventListener('click', handleNavClick)
    }
  }, [pathname, router])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const hamburger = document.querySelector('.hamburger')
      const navMenu = document.querySelector('.nav-menu')
      const target = e.target as HTMLElement

      if (hamburger && navMenu && !hamburger.contains(target) && !navMenu.contains(target)) {
        setNavMenuActive(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Handle hash links when page loads (for direct navigation)
  useEffect(() => {
    if (pathname === '/' && window.location.hash) {
      const hash = window.location.hash
      setTimeout(() => {
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      }, 100)
    }
  }, [pathname])

  // Fetch user permissions
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/users/permissions')
        .then(res => res.json())
        .then(data => {
          if (data.permissions) {
            setPermissions(new Set(data.permissions))
          }
        })
        .catch(err => {
          console.error('Error fetching permissions:', err)
        })
    } else {
      setPermissions(new Set())
    }
  }, [session])

  return (
    <nav className="navbar" style={{ backgroundColor: navbarBg }}>
      <div className="container">
        <Link href="/" className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Repair Assistant</span>
        </Link>
        <ul className={`nav-menu ${navMenuActive ? 'active' : ''}`}>
          {status !== 'loading' && session ? (
            <>
              <li>
                <Link href="/dashboard">{t.nav.dashboard}</Link>
              </li>
              {permissions.has(Permission.VIEW_TICKETS) && (
                <li>
                  <Link href="/tickets">{t.nav.tickets}</Link>
                </li>
              )}
              {permissions.has(Permission.VIEW_INVENTORY) && (
                <li>
                  <Link href="/inventory">{t.nav.inventory}</Link>
                </li>
              )}
              {permissions.has(Permission.VIEW_CUSTOMERS) && (
                <li>
                  <Link href="/clients">{t.nav.clients}</Link>
                </li>
              )}
              {permissions.has(Permission.VIEW_REPORTS) && (
                <li>
                  <Link href="/reports">{t.nav.reports}</Link>
                </li>
              )}
              {permissions.has(Permission.VIEW_SETTINGS) && (
                <li>
                  <Link href="/settings">{t.nav.settings}</Link>
                </li>
              )}
            </>
          ) : status !== 'loading' ? (
            <>
              <li><a href="#home">{t.nav.home}</a></li>
              <li><a href="#contact">{t.nav.contact}</a></li>
            </>
          ) : null}
        </ul>
        <div className="navbar-right">
          {status === 'loading' ? (
            <span className="auth-loading">{t.auth.loading}</span>
          ) : session ? (
            <ProfileDropdown />
          ) : (
            <>
              <Link href="/login" className="btn btn-primary btn-sm">
                {t.auth.login}
              </Link>
            </>
          )}
          <div 
            className={`hamburger ${navMenuActive ? 'active' : ''}`}
            onClick={() => setNavMenuActive(!navMenuActive)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </nav>
  )
}

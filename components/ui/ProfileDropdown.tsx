'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '../../contexts/LanguageContext'

export default function ProfileDropdown() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : session?.user?.email?.[0].toUpperCase() || '?'

  const profileImage = session?.user?.image || null

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-dropdown__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t.profile?.menu || 'Profile menu'}
      >
        {profileImage ? (
          <Image
            src={profileImage}
            alt={session?.user?.name || 'Profile'}
            width={32}
            height={32}
            className="profile-dropdown__avatar"
            style={{ objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : (
          <div className="profile-dropdown__avatar-placeholder">
            {userInitials}
          </div>
        )}
        <span className="profile-dropdown__name">
          {session?.user?.name || session?.user?.email}
        </span>
        <svg
          className={`profile-dropdown__chevron ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="profile-dropdown__menu">
          <Link
            href="/settings"
            className="profile-dropdown__item"
            onClick={() => setIsOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M0 14C0 11.2386 2.23858 9 5 9H11C13.7614 9 16 11.2386 16 14V16H0V14Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>{t.settings?.title || 'Settings'}</span>
          </Link>
          <div className="profile-dropdown__divider"></div>
          <button
            className="profile-dropdown__item profile-dropdown__item--danger"
            onClick={handleLogout}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6M10 11.3333L14 8M14 8L10 4.66667M14 8H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{t.auth.logout}</span>
          </button>
        </div>
      )}
    </div>
  )
}


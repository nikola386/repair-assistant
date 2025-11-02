'use client'

import CookieConsent from 'react-cookie-consent'
import { useLanguage } from '../../contexts/LanguageContext'

export default function CookieBanner() {
  const { t } = useLanguage()

  return (
    <CookieConsent
      location="bottom"
      buttonText={t.cookies.accept}
      declineButtonText={t.cookies.decline}
      enableDeclineButton
      cookieName="cookieConsent"
      style={{
        background: 'rgba(30, 30, 30, 0.98)',
        padding: '1.5rem',
        alignItems: 'center',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        borderTop: '2px solid rgba(255, 235, 59, 0.4)',
      }}
      buttonStyle={{
        background: 'linear-gradient(135deg, #FFD700 0%, #ffd54f 100%)',
        color: '#000000',
        fontSize: '1rem',
        fontWeight: '600',
        padding: '0.8rem 2rem',
        borderRadius: '50px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(255, 235, 59, 0.3)',
      }}
      declineButtonStyle={{
        background: 'transparent',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '1rem',
        fontWeight: '600',
        padding: '0.8rem 2rem',
        borderRadius: '50px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginRight: '1rem',
      }}
      contentStyle={{
        margin: '0',
        padding: '0',
        flex: '1',
        fontSize: '1rem',
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: '1.6',
      }}
      expires={365}
      onAccept={() => {
        // Optional: Add analytics or other tracking code here
        console.log('Cookies accepted')
      }}
      onDecline={() => {
        // Optional: Handle decline
        console.log('Cookies declined')
      }}
    >
      {t.cookies.message}
    </CookieConsent>
  )
}

import { auth } from './auth.config'
import type { Session } from 'next-auth'

export async function getAuthSession() {
  const session = await auth()
  return session
}

// Type guard: ensures session has user property
function hasUser(session: Session | null): session is Session & { user: NonNullable<Session['user']> } {
  return session !== null && session.user !== null && session.user !== undefined
}

export async function requireAuth(): Promise<(Session & { user: NonNullable<Session['user']> }) | null> {
  const session = await getAuthSession()
  
  if (!hasUser(session)) {
    return null
  }
  
  return session
}


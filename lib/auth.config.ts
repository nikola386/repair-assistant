import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { userStorage } from './userStorage'
import { logger } from './logger'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Auth attempt with missing credentials')
            return null
          }

          logger.info('Authentication attempt', { email: credentials.email })
          const user = await userStorage.findByEmail(credentials.email as string)
          if (!user) {
            logger.warn('Authentication failed: user not found', { email: credentials.email })
            return null
          }

          const isValid = await userStorage.verifyPassword(user, credentials.password as string)
          if (!isValid) {
            logger.warn('Authentication failed: invalid password', { email: credentials.email, userId: user.id })
            return null
          }

          logger.info('Authentication successful', { email: credentials.email, userId: user.id })
          return {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            image: user.profileImage || null,
          }
        } catch (error) {
          logger.error('Authentication error', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: sessionData }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.image = user.image || null
      }
      // Update token when profile is updated
      if (trigger === 'update' && sessionData?.user) {
        token.image = sessionData.user.image || token.image
        token.email = sessionData.user.email || token.email
        token.name = sessionData.user.name || token.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.image = token.image as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: (() => {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      throw new Error(
        'NEXTAUTH_SECRET environment variable is required. Please set it to a strong, randomly generated secret (minimum 32 characters).'
      )
    }
    if (secret.length < 32) {
      throw new Error(
        'NEXTAUTH_SECRET must be at least 32 characters long for security. Please use a stronger secret.'
      )
    }
    return secret
  })(),
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token' 
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})


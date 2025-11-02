import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Debug: Log DATABASE_URL to see which DB is being used
if (process.env.NODE_ENV === 'development') {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET'
  const isRemote = dbUrl.includes('.supabase.co') || dbUrl.includes('vercel') || dbUrl.includes('amazonaws.com') || dbUrl.includes('azure.com')
  console.log('🔍 DATABASE_URL:', isRemote ? '🌐 REMOTE' : '💻 LOCAL', dbUrl.replace(/:[^:@]+@/, ':****@'))
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db

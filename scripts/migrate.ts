/**
 * Database migration script
 * 
 * Usage: 
 *   npx tsx scripts/migrate.ts
 * 
 * This script initializes the database schema and should be run:
 * - Before starting the application for the first time
 * - As a separate step during deployment (e.g., Vercel post-deploy hook)
 * - After pulling database schema changes
 * 
 * Environment Variables:
 * - DATABASE_URL: Connection string (Supabase, Vercel, etc.) - takes precedence
 * - OR individual vars: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
 * 
 * Note: Requires tsx to be installed: npm install -g tsx
 */

import { initializeDatabase } from '../lib/migrations'
import { db } from '../lib/db'

async function migrate() {
  try {
    // Check if database connection is available
    if (!process.env.DATABASE_URL && !process.env.DB_HOST && !process.env.DB_USER) {
      console.warn('⚠️  No database connection configuration found.')
      console.warn('   Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD environment variables.')
      console.warn('   Migration skipped for now - run manually after deployment.')
      process.exit(0) // Exit with success to not fail builds
    }

    console.log('Starting database migration...')
    console.log(`Using: ${process.env.DATABASE_URL ? 'Connection string (DATABASE_URL)' : 'Individual environment variables'}`)
    
    await initializeDatabase()
    console.log('✅ Database migration completed successfully!')
    
    // Close database connection
    await db.$disconnect()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Database migration failed:', error.message)
    
    // For build environments (like Vercel), don't fail the build if migration fails
    // The migration can be run separately after deployment
    if (process.env.VERCEL || process.env.CI) {
      console.warn('⚠️  Migration failed during build - this is OK.')
      console.warn('   Run migrations manually after deployment or use a post-deploy hook.')
      await db.$disconnect()
      process.exit(0) // Exit with success to not fail builds
    } else {
      console.error('Full error:', error)
      await db.$disconnect()
      process.exit(1)
    }
  }
}

migrate()


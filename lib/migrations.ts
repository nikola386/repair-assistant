import { db } from './db'
import { Pool } from 'pg'

async function query(text: string, params?: any[]) {
  try {
    if (params && params.length > 0) {
      return await db.$queryRawUnsafe(text, ...params)
    } else {
      return await db.$executeRawUnsafe(text)
    }
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

async function ensureDatabaseExists() {
  if (process.env.DATABASE_URL) {
    console.log('Using connection string - skipping database creation (managed by provider)')
    return
  }

  const dbName = process.env.DB_NAME || 'repair_tickets'
  
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })

  try {
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    )

    if (result.rows.length === 0) {
      console.log(`Creating database ${dbName}...`)
      await adminPool.query(`CREATE DATABASE ${dbName}`)
      console.log(`Database ${dbName} created successfully`)
    } else {
      console.log(`Database ${dbName} already exists`)
    }
  } catch (error: any) {
    if (error.code === '3D000') {
      try {
        await adminPool.query(`CREATE DATABASE ${dbName}`)
        console.log(`Database ${dbName} created successfully`)
      } catch (createError) {
        console.error('Error creating database:', createError)
        throw createError
      }
    } else {
      console.error('Error checking database:', error)
      throw error
    }
  } finally {
    await adminPool.end()
  }
}

export async function initializeDatabase() {
  try {
    await ensureDatabaseExists()

    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email      )
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS repair_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        device_type VARCHAR(255) NOT NULL,
        device_brand VARCHAR(255),
        device_model VARCHAR(255),
        issue_description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        estimated_cost DECIMAL(10, 2),
        actual_cost DECIMAL(10, 2),
        estimated_completion_date DATE,
        actual_completion_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_repair_tickets_customer_id ON repair_tickets(customer_id)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON repair_tickets(status)
    `)
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_priority ON repair_tickets(priority)
    `)
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON repair_tickets(created_at DESC)
    `)
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON repair_tickets(ticket_number)
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS ticket_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ticket_images_ticket FOREIGN KEY (ticket_id) REFERENCES repair_tickets(id) ON DELETE CASCADE
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_images_ticket_id ON ticket_images(ticket_id)
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        profile_image VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'profile_image'
        ) THEN
          ALTER TABLE users ADD COLUMN profile_image VARCHAR(500);
        END IF;
      END $$;
    `)

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'email_verified'
        ) THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `)

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'verification_token'
        ) THEN
          ALTER TABLE users ADD COLUMN verification_token TEXT;
        END IF;
      END $$;
    `)

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'verification_token_expiry'
        ) THEN
          ALTER TABLE users ADD COLUMN verification_token_expiry TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `)

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_verification_email_sent'
        ) THEN
          ALTER TABLE users ADD COLUMN last_verification_email_sent TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token)
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type VARCHAR(50),
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_account_id)
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)
    `)

    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)

    await query(`
      DROP TRIGGER IF EXISTS update_repair_tickets_updated_at ON repair_tickets;
      CREATE TRIGGER update_repair_tickets_updated_at
      BEFORE UPDATE ON repair_tickets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `)

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'repair_tickets' AND column_name = 'customer_id'
        ) THEN
          INSERT INTO customers (id, name, email, phone, created_at, updated_at)
          SELECT DISTINCT ON (LOWER(customer_email))
            gen_random_uuid(),
            customer_name,
            customer_email,
            customer_phone,
            MIN(created_at) OVER (PARTITION BY LOWER(customer_email)),
            CURRENT_TIMESTAMP
          FROM repair_tickets
          WHERE NOT EXISTS (
            SELECT 1 FROM customers WHERE LOWER(customers.email) = LOWER(repair_tickets.customer_email)
          )
          ORDER BY LOWER(customer_email), created_at;

          ALTER TABLE repair_tickets ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

          UPDATE repair_tickets rt
          SET customer_id = c.id
          FROM customers c
          WHERE LOWER(rt.customer_email) = LOWER(c.email);

          ALTER TABLE repair_tickets ALTER COLUMN customer_id SET NOT NULL;

          CREATE INDEX IF NOT EXISTS idx_repair_tickets_customer_id ON repair_tickets(customer_id);

          ALTER TABLE repair_tickets DROP COLUMN IF EXISTS customer_name;
          ALTER TABLE repair_tickets DROP COLUMN IF EXISTS customer_email;
          ALTER TABLE repair_tickets DROP COLUMN IF EXISTS customer_phone;
        END IF;
      END $$;
    `)

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

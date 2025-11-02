# Repair Assistant - Main Application

Full-featured repair management application with dashboard, tickets, clients, and more.

## Features

- User authentication with NextAuth
- Dashboard with statistics and charts
- Ticket management system
- Client management
- Reports and analytics
- Settings and profile management
- Multi-language support (EN/BG)
- PostgreSQL database with Prisma

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm, yarn, or pnpm

### Installation

```bash
npm install
```

### Database Setup

1. Set up PostgreSQL database (see main README for instructions)

2. Create `.env.local` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/repair_tickets

# Or use individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=repair_tickets
DB_USER=your_user
DB_PASSWORD=your_password
DB_SSL=false

# Authentication
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3001

# Home app URL (for redirects)
NEXT_PUBLIC_HOME_URL=http://localhost:3000

# Vercel Blob Storage (for ticket images)
BLOB_READ_WRITE_TOKEN=your-token

# Email configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SECURE=false
```

3. Run database migrations:

```bash
npm run migrate
# or
npx tsx scripts/migrate.ts
```

4. (Optional) Create admin user:

```bash
npx tsx scripts/create-user.ts admin@example.com password123 "Admin User"
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Build

```bash
npm run build
npm start
```

### Database Scripts

```bash
# Run migrations
npm run migrate

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio
npm run prisma:studio

# Run migrations (dev)
npm run prisma:migrate
```

## Project Structure

```
apps/repair-assistant/
├── app/
│   ├── api/
│   │   ├── auth/             # NextAuth routes
│   │   ├── customers/         # Customer API
│   │   ├── dashboard/        # Dashboard stats
│   │   ├── profile/           # Profile API
│   │   ├── settings/          # Settings API
│   │   └── tickets/           # Tickets API
│   ├── dashboard/             # Dashboard page
│   ├── tickets/                # Ticket pages
│   ├── clients/                # Client pages
│   ├── reports/                # Reports page
│   ├── settings/               # Settings page
│   └── profile/                # Profile pages
├── components/
│   ├── layout/                 # Navigation
│   ├── tickets/                # Ticket components
│   └── ui/                      # UI components
├── contexts/                    # Language context
├── locales/                     # Translations
├── lib/                         # Libraries (auth, db, etc.)
├── prisma/                       # Database schema
├── scripts/                      # Utility scripts
├── styles/                       # SCSS stylesheets
└── types/                        # TypeScript types
```

## API Routes

- `POST /api/auth/signin` - Sign in
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/[id]` - Get ticket
- `PUT /api/tickets/[id]` - Update ticket
- `DELETE /api/tickets/[id]` - Delete ticket
- `GET /api/customers` - List customers
- `GET /api/dashboard/stats` - Dashboard statistics
- And more...

## Notes

- Requires database connection
- Authentication required for all routes
- Completely independent from home-app


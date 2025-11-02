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

### Authentication

#### `POST /api/auth/[...nextauth]`
NextAuth authentication handler for sign in, sign out, and session management.

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

---

### Tickets

#### `GET /api/tickets`
List all tickets for the authenticated user's store. Supports filtering and pagination.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `in_progress`, `waiting_parts`, `completed`, `cancelled`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`, `urgent`)
- `search` (optional): Search in ticket fields
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "tickets": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

#### `POST /api/tickets`
Create a new repair ticket.

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1234567890",
  "deviceType": "Smartphone",
  "deviceBrand": "Apple",
  "deviceModel": "iPhone 14",
  "issueDescription": "Screen not turning on",
  "priority": "high",
  "estimatedCost": 250.00,
  "estimatedCompletionDate": "2024-12-31",
  "notes": "Urgent repair needed"
}
```

**Response:** `201 Created`

#### `GET /api/tickets/[id]`
Get a specific ticket by ID.

**Response:** `200 OK`

#### `PATCH /api/tickets/[id]`
Update a ticket. All fields are optional.

**Request Body:**
```json
{
  "status": "completed",
  "actualCost": 275.00,
  "actualCompletionDate": "2024-12-25",
  "notes": "Repair completed successfully"
}
```

**Response:** `200 OK`

#### `DELETE /api/tickets/[id]`
Delete a ticket.

**Response:** `200 OK`

---

### Ticket Expenses

#### `GET /api/tickets/[id]/expenses`
Get all expenses for a specific ticket.

**Response:** `200 OK`
```json
{
  "expenses": [
    {
      "id": "expense-id",
      "ticketId": "ticket-id",
      "name": "Screen Replacement",
      "quantity": 1,
      "price": 150.00,
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

#### `POST /api/tickets/[id]/expenses`
Create a new expense for a ticket.

**Request Body:**
```json
{
  "name": "Screen Replacement",
  "quantity": 1,
  "price": 150.00
}
```

**Response:** `201 Created`

#### `PATCH /api/tickets/[id]/expenses/[expenseId]`
Update an expense.

**Request Body:**
```json
{
  "name": "Screen Replacement (Updated)",
  "quantity": 2,
  "price": 300.00
}
```

**Response:** `200 OK`

#### `DELETE /api/tickets/[id]/expenses/[expenseId]`
Delete an expense.

**Response:** `200 OK`

---

### Ticket Images

#### `POST /api/tickets/images`
Upload an image or PDF file for a ticket.

**Request:** `multipart/form-data`
- `ticketId`: Ticket ID (string)
- `file`: Image or PDF file (max 2MB)
  - Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`

**Response:** `201 Created`
```json
{
  "image": {
    "id": "image-id",
    "ticketId": "ticket-id",
    "fileName": "image.jpg",
    "url": "https://...",
    "size": 102400,
    "mimeType": "image/jpeg",
    "createdAt": "2024-12-01T10:00:00Z"
  },
  "message": "Image uploaded successfully"
}
```

#### `DELETE /api/tickets/images?imageId=[id]`
Delete a ticket image.

**Query Parameters:**
- `imageId`: Image ID (required)

**Response:** `200 OK`

---

### Customers

#### `GET /api/customers`
List all customers for the authenticated user's store.

**Query Parameters:**
- `search` (optional): Search in name, email, or phone
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:** `200 OK`
```json
{
  "customers": [
    {
      "id": "customer-id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "ticketCount": 5,
      "createdAt": "2024-12-01T10:00:00Z",
      "updatedAt": "2024-12-01T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

#### `GET /api/customers/[id]`
Get a specific customer with all their tickets.

**Response:** `200 OK`
```json
{
  "customer": {
    "id": "customer-id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "ticketCount": 5,
    "createdAt": "2024-12-01T10:00:00Z",
    "updatedAt": "2024-12-01T10:00:00Z"
  },
  "tickets": [...]
}
```

#### `GET /api/customers/search?q=[query]&limit=[limit]`
Search customers by name, email, or phone number.

**Query Parameters:**
- `q`: Search query (minimum 2 characters)
- `limit`: Maximum results (default: 10)

**Response:** `200 OK`
```json
{
  "customers": [
    {
      "id": "customer-id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  ]
}
```

---

### Dashboard

#### `GET /api/dashboard/stats?period=[period]`
Get dashboard statistics and chart data.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `180d`, `360d`) - default: `30d`

**Response:** `200 OK`
```json
{
  "totalRepairs": 100,
  "inProgressRepairs": 15,
  "waitingRepairs": 8,
  "income": 25000.00,
  "expenses": 5000.00,
  "grossProfit": 20000.00,
  "grossProfitPercentage": 80.00,
  "averageRepairTime": 5.5,
  "completionRate": 75.50,
  "chartData": [
    {
      "date": "2024-12-01",
      "income": 500.00,
      "expenses": 100.00,
      "profit": 400.00,
      "profitPercentage": 80.00
    }
  ]
}
```

---

### Profile

#### `GET /api/profile`
Get the authenticated user's profile and store information.

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "profileImage": "https://..."
  },
  "store": {
    "id": "store-id",
    "name": "Store Name",
    "country": "US",
    "vatNumber": "VAT123"
  }
}
```

#### `PATCH /api/profile`
Update user profile and store information.

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "country": "US",
  "vatNumber": "VAT123"
}
```

**Response:** `200 OK`

#### `POST /api/profile/image`
Upload a profile image.

**Request:** `multipart/form-data`
- `file`: Image file (max 2MB)
  - Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`

**Response:** `200 OK`

#### `DELETE /api/profile/image`
Delete the profile image.

**Response:** `200 OK`

#### `PATCH /api/profile/password`
Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:** `200 OK`

---

### Settings

#### `GET /api/settings`
Get store settings and configuration.

**Response:** `200 OK`
```json
{
  "store": {
    "id": "store-id",
    "name": "Store Name",
    "address": "123 Main St, City, State 12345",
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "postalCode": "12345",
    "country": "US",
    "website": "https://example.com",
    "phone": "+1234567890",
    "currency": "USD",
    "vatNumber": "VAT123",
    "logo": "https://..."
  },
  "settings": {
    "id": "settings-id",
    "storeId": "store-id",
    "primaryColor": "#FFD700",
    "secondaryColor": "#000000"
  }
}
```

#### `PATCH /api/settings`
Update store settings. Supports both JSON and FormData.

**Request (FormData):** `multipart/form-data`
- `storeName`: Store name
- `street`, `city`, `state`, `postalCode`, `country`: Address components
- `website`: Website URL
- `phone`: Phone number
- `currency`: Currency code (e.g., "USD")
- `vatNumber`: VAT number
- `logo`: Logo image file (max 2MB)
- `removeLogo`: Set to "true" to remove logo
- `primaryColor`: Primary color (hex format)
- `secondaryColor`: Secondary color (hex format)

**Request (JSON):** (for backward compatibility, colors only)
```json
{
  "primaryColor": "#FFD700",
  "secondaryColor": "#000000"
}
```

**Response:** `200 OK`

---

### Onboarding

#### `GET /api/onboarding`
Check onboarding completion status.

**Response:** `200 OK`
```json
{
  "isComplete": true,
  "store": {
    "id": "store-id",
    "name": "Store Name",
    "onboarded": true
  },
  "settings": {
    "primaryColor": "#FFD700",
    "secondaryColor": "#000000"
  }
}
```

#### `POST /api/onboarding`
Complete store onboarding setup.

**Request:** `multipart/form-data`
- `storeName`: Store name (required)
- `street`, `city`, `state`, `postalCode`, `country`: Address components
- `website`: Website URL
- `phone`: Phone number
- `currency`: Currency code
- `vatNumber`: VAT number
- `logo`: Logo image file (max 2MB)
- `primaryColor`: Primary color (hex format)
- `secondaryColor`: Secondary color (hex format)

**Response:** `200 OK`

---

### Countries

#### `GET /api/countries`
Get list of all countries (for dropdowns and VAT validation).

**Response:** `200 OK`
```json
{
  "countries": [
    {
      "code": "US",
      "name": "United States",
      "requiresVat": false
    },
    {
      "code": "GB",
      "name": "United Kingdom",
      "requiresVat": false
    }
  ]
}
```

---

## Authentication

All API routes (except `/api/auth/register` and `/api/auth/[...nextauth]`) require authentication via NextAuth session. The authentication is handled automatically via session cookies.

---

## Seed Scripts

### Seed Countries

Populates the database with a comprehensive list of countries and their VAT requirements.

**Usage:**
```bash
npx tsx scripts/seed-countries.ts
```

**Description:**
- Seeds 200+ countries with ISO codes and names
- Marks EU countries that require VAT numbers
- Safe to run multiple times (uses upsert)

**Note:** Requires database connection and Country model to be migrated.

---

### Seed Tickets

Generates 100 sample repair tickets with realistic data for testing and development.

**Usage:**
```bash
npx tsx scripts/seed-tickets.ts
```

**Description:**
- Creates 100 tickets with random:
  - Customer names, emails, and phone numbers
  - Device types, brands, and models
  - Issue descriptions
  - Statuses (`pending`, `in_progress`, `waiting_parts`, `completed`, `cancelled`)
  - Priorities (`low`, `medium`, `high`, `urgent`)
  - Costs and completion dates
  - Notes
- Automatically creates or reuses customers by email
- Generates expenses for some tickets (40% chance)
- Tickets are created with dates within the last 180 days

**Warning:** This script will add 100 tickets to your database. Existing tickets are not deleted.

**Note:** Requires database connection, Store model, Customer model, and RepairTicket model to be migrated.

---

### Create User

Creates a new user account in the database.

**Usage:**
```bash
npx tsx scripts/create-user.ts <email> <password> [name]
```

**Example:**
```bash
npx tsx scripts/create-user.ts admin@example.com mypassword123 "Admin User"
```

**Description:**
- Creates a new user with email and password
- Automatically creates an associated store
- Checks for existing users with the same email
- Returns user ID, email, and name on success

**Note:** Requires database connection and User model to be migrated.

---

### Database Migration

Initializes and migrates the database schema.

**Usage:**
```bash
npx tsx scripts/migrate.ts
```

Or use the npm script:
```bash
npm run migrate
```

**Description:**
- Runs Prisma migrations to set up the database schema
- Safe to run multiple times
- Automatically handles missing database connections gracefully
- Used during deployment and initial setup

**Environment Variables Required:**
- `DATABASE_URL`: Full connection string, OR
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`: Individual connection parameters

## Notes

- Requires database connection
- Authentication required for all routes
- Completely independent from home-app


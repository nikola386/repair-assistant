# POS (Point of Sale) Feature Implementation Plan

## Overview
This document outlines the implementation plan for adding a Point of Sale (POS) feature to the Repair Assistant application. The POS system will allow repair shops to sell products directly from inventory, process payments, generate receipts, and track sales transactions.

## Table of Contents
1. [Database Schema Changes](#database-schema-changes)
2. [API Endpoints](#api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Permissions & Access Control](#permissions--access-control)
5. [Integration Points](#integration-points)
6. [Features & Functionality](#features--functionality)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)

---

## Database Schema Changes

### New Models

#### 1. Sale Model
```prisma
model Sale {
  id                String   @id @default(uuid())
  saleNumber        String   @unique @map("sale_number")
  storeId           String   @map("store_id")
  customerId        String?  @map("customer_id") // Optional - can be walk-in customer
  userId            String   @map("user_id") // Cashier/seller
  status            String   @default("completed") // "completed", "cancelled", "refunded"
  
  // Pricing
  subtotal          Decimal  @db.Decimal(10, 2)
  taxAmount         Decimal  @default(0) @map("tax_amount") @db.Decimal(10, 2)
  discountAmount    Decimal  @default(0) @map("discount_amount") @db.Decimal(10, 2)
  total             Decimal  @db.Decimal(10, 2)
  
  // Payment
  paymentMethod     String   @map("payment_method") // "cash", "card", "mobile", "other"
  paymentStatus     String   @default("paid") @map("payment_status") // "paid", "partial", "pending"
  amountPaid        Decimal  @map("amount_paid") @db.Decimal(10, 2)
  amountDue         Decimal  @default(0) @map("amount_due") @db.Decimal(10, 2)
  
  // Metadata
  notes             String?  @db.Text
  receiptPrinted    Boolean  @default(false) @map("receipt_printed")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  // Relations
  store             Store         @relation(fields: [storeId], references: [id], onDelete: Restrict)
  customer          Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  user              User          @relation(fields: [userId], references: [id], onDelete: Restrict)
  saleItems         SaleItem[]
  payments          Payment[]
  
  @@index([storeId])
  @@index([customerId])
  @@index([userId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@index([saleNumber])
  @@map("sales")
}
```

#### 2. SaleItem Model
```prisma
model SaleItem {
  id                String   @id @default(uuid())
  saleId            String   @map("sale_id")
  inventoryItemId   String?  @map("inventory_item_id") // Nullable for non-inventory items
  name              String   // Product name (snapshot at time of sale)
  sku               String?  // SKU (snapshot)
  quantity          Decimal  @db.Decimal(10, 2)
  unitPrice         Decimal  @map("unit_price") @db.Decimal(10, 2)
  discountAmount    Decimal  @default(0) @map("discount_amount") @db.Decimal(10, 2)
  taxAmount         Decimal  @default(0) @map("tax_amount") @db.Decimal(10, 2)
  lineTotal         Decimal  @map("line_total") @db.Decimal(10, 2)
  createdAt         DateTime @default(now()) @map("created_at")
  
  // Relations
  sale              Sale           @relation(fields: [saleId], references: [id], onDelete: Cascade)
  inventoryItem     InventoryItem? @relation(fields: [inventoryItemId], references: [id], onDelete: SetNull)
  
  @@index([saleId])
  @@index([inventoryItemId])
  @@map("sale_items")
}
```

#### 3. Payment Model
```prisma
model Payment {
  id                String   @id @default(uuid())
  saleId            String   @map("sale_id")
  paymentMethod     String   @map("payment_method") // "cash", "card", "mobile", "other"
  amount            Decimal  @db.Decimal(10, 2)
  reference         String?  // Transaction reference, receipt number, etc.
  notes             String?  @db.Text
  createdAt         DateTime @default(now()) @map("created_at")
  
  // Relations
  sale              Sale     @relation(fields: [saleId], references: [id], onDelete: Cascade)
  
  @@index([saleId])
  @@index([createdAt])
  @@map("payments")
}
```

### Updated Models

#### Store Model
Add POS-related settings:
```prisma
model Store {
  // ... existing fields ...
  
  // POS Settings
  posEnabled        Boolean  @default(false) @map("pos_enabled")
  posReceiptHeader  String?  @map("pos_receipt_header") @db.Text
  posReceiptFooter  String?  @map("pos_receipt_footer") @db.Text
  posPrintEnabled   Boolean  @default(false) @map("pos_print_enabled")
  
  // ... existing relations ...
  sales             Sale[]
}
```

#### Customer Model
No changes needed (already exists)

#### InventoryItem Model
No schema changes needed, but will be used for POS sales

#### User Model
No changes needed (already tracks who made the sale)

---

## API Endpoints

### Base Path: `/api/pos`

#### 1. GET `/api/pos/sales`
**Purpose:** List all sales with filtering and pagination

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `search` (string) - Search by sale number or customer name
- `status` (string) - Filter by status: "completed", "cancelled", "refunded"
- `customerId` (string) - Filter by customer
- `userId` (string) - Filter by cashier
- `startDate` (date) - Filter sales from date
- `endDate` (date) - Filter sales to date
- `paymentMethod` (string) - Filter by payment method

**Response:**
```json
{
  "sales": [
    {
      "id": "uuid",
      "saleNumber": "SALE-001",
      "customerId": "uuid",
      "customerName": "John Doe",
      "userId": "uuid",
      "userName": "Cashier Name",
      "status": "completed",
      "subtotal": 100.00,
      "taxAmount": 10.00,
      "discountAmount": 0.00,
      "total": 110.00,
      "paymentMethod": "cash",
      "paymentStatus": "paid",
      "amountPaid": 110.00,
      "amountDue": 0.00,
      "items": [...],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 100,
  "totalPages": 2
}
```

**Permissions:** `VIEW_POS` or `VIEW_POS_SALES`

---

#### 2. POST `/api/pos/sales`
**Purpose:** Create a new sale/transaction

**Request Body:**
```json
{
  "customerId": "uuid" | null,
  "items": [
    {
      "inventoryItemId": "uuid" | null,
      "name": "Product Name",
      "sku": "SKU-001",
      "quantity": 2,
      "unitPrice": 50.00,
      "discountAmount": 0.00
    }
  ],
  "discountAmount": 0.00,
  "paymentMethod": "cash",
  "amountPaid": 110.00,
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "sale": {
    "id": "uuid",
    "saleNumber": "SALE-001",
    "total": 110.00,
    "paymentStatus": "paid",
    ...
  },
  "message": "Sale completed successfully"
}
```

**Permissions:** `CREATE_POS_SALE`

**Business Logic:**
- Generate unique sale number (format: `SALE-{storeId}-{timestamp}` or sequential)
- Calculate subtotal from items
- Apply tax based on store settings
- Calculate total
- Update inventory quantities (if inventoryItemId is provided)
- Create payment record
- Return sale with all details

---

#### 3. GET `/api/pos/sales/[id]`
**Purpose:** Get sale details by ID

**Response:**
```json
{
  "sale": {
    "id": "uuid",
    "saleNumber": "SALE-001",
    "customer": {...},
    "user": {...},
    "items": [...],
    "payments": [...],
    ...
  }
}
```

**Permissions:** `VIEW_POS` or `VIEW_POS_SALES`

---

#### 4. POST `/api/pos/sales/[id]/cancel`
**Purpose:** Cancel a sale (before end of day)

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Response:**
```json
{
  "sale": {...},
  "message": "Sale cancelled successfully"
}
```

**Permissions:** `CANCEL_POS_SALE`

**Business Logic:**
- Restore inventory quantities
- Mark sale as cancelled
- Create audit log entry

---

#### 5. POST `/api/pos/sales/[id]/refund`
**Purpose:** Process a refund for a sale

**Request Body:**
```json
{
  "items": [
    {
      "saleItemId": "uuid",
      "quantity": 1
    }
  ],
  "amount": 50.00,
  "reason": "Defective product"
}
```

**Response:**
```json
{
  "refund": {...},
  "message": "Refund processed successfully"
}
```

**Permissions:** `PROCESS_POS_REFUND`

---

#### 6. GET `/api/pos/inventory/search`
**Purpose:** Search inventory items for POS (quick search)

**Query Parameters:**
- `search` (string) - Search by name or SKU
- `limit` (number, default: 20) - Limit results

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Product Name",
      "sku": "SKU-001",
      "currentQuantity": 10,
      "unitPrice": 50.00,
      "category": "Category"
    }
  ]
}
```

**Permissions:** `VIEW_POS` or `VIEW_INVENTORY`

---

#### 7. GET `/api/pos/receipt/[saleId]`
**Purpose:** Generate receipt PDF for a sale

**Response:** PDF file

**Permissions:** `VIEW_POS` or `VIEW_POS_SALES`

---

#### 8. GET `/api/pos/stats`
**Purpose:** Get POS statistics for dashboard

**Query Parameters:**
- `period` (string) - "7d", "30d", "180d", "360d"
- `startDate` (date)
- `endDate` (date)

**Response:**
```json
{
  "totalSales": 100,
  "totalRevenue": 10000.00,
  "totalItemsSold": 500,
  "averageTransactionValue": 100.00,
  "topSellingItems": [...],
  "salesByPaymentMethod": {...},
  "salesByDay": [...]
}
```

**Permissions:** `VIEW_POS` or `VIEW_REPORTS`

---

## Frontend Components

### Page Components

#### 1. `/app/pos/page.tsx` - Main POS Interface
**Features:**
- Product search/scan interface
- Shopping cart
- Customer selection (existing or new)
- Payment processing
- Receipt generation
- Keyboard shortcuts for quick operation

**Layout:**
- Left panel: Product search and selection
- Center panel: Shopping cart
- Right panel: Customer info, totals, payment

---

#### 2. `/app/pos/sales/page.tsx` - Sales History
**Features:**
- List of all sales
- Filtering and search
- View sale details
- Cancel/refund actions
- Export functionality

---

#### 3. `/app/pos/sales/[id]/page.tsx` - Sale Details
**Features:**
- View complete sale information
- Print receipt
- Process refund
- View payment details

---

### UI Components

#### 1. `components/pos/ProductSearch.tsx`
- Quick search input with barcode scanner support
- Product grid/list view
- Stock availability indicator
- Add to cart button

#### 2. `components/pos/ShoppingCart.tsx`
- Cart items list
- Quantity adjustment
- Remove item
- Line totals
- Discount application

#### 3. `components/pos/CustomerSelector.tsx`
- Search existing customers
- Create new customer (quick form)
- Walk-in customer option

#### 4. `components/pos/PaymentPanel.tsx`
- Subtotal, tax, discount, total display
- Payment method selection
- Amount paid input
- Change calculation
- Complete sale button

#### 5. `components/pos/SalesList.tsx`
- Table/grid of sales
- Status badges
- Quick actions
- Pagination

#### 6. `components/pos/ReceiptModal.tsx`
- Receipt preview
- Print functionality
- Email receipt option

---

## Permissions & Access Control

### New Permissions

Add to `lib/permissions.ts`:

```typescript
export enum Permission {
  // ... existing permissions ...
  
  // POS Permissions
  VIEW_POS = 'pos.view',
  CREATE_POS_SALE = 'pos.create',
  VIEW_POS_SALES = 'pos.sales.view',
  CANCEL_POS_SALE = 'pos.sales.cancel',
  PROCESS_POS_REFUND = 'pos.refund',
  VIEW_POS_REPORTS = 'pos.reports.view',
}
```

### Role Permissions

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // ... existing permissions ...
    Permission.VIEW_POS,
    Permission.CREATE_POS_SALE,
    Permission.VIEW_POS_SALES,
    Permission.CANCEL_POS_SALE,
    Permission.PROCESS_POS_REFUND,
    Permission.VIEW_POS_REPORTS,
  ],
  [UserRole.MANAGER]: [
    // ... existing permissions ...
    Permission.VIEW_POS,
    Permission.CREATE_POS_SALE,
    Permission.VIEW_POS_SALES,
    Permission.CANCEL_POS_SALE,
    Permission.PROCESS_POS_REFUND,
    Permission.VIEW_POS_REPORTS,
  ],
  [UserRole.TECHNICIAN]: [
    // ... existing permissions ...
    Permission.VIEW_POS,
    Permission.CREATE_POS_SALE,
    Permission.VIEW_POS_SALES,
  ],
  [UserRole.VIEWER]: [
    // ... existing permissions ...
    Permission.VIEW_POS_SALES,
  ],
};
```

---

## Integration Points

### 1. Inventory Integration
- **Stock Deduction:** When items are sold, automatically reduce inventory quantities
- **Stock Validation:** Check availability before adding to cart
- **Low Stock Alerts:** Warn when selling items below minimum quantity
- **Stock Restoration:** Restore stock when sale is cancelled/refunded

### 2. Customer Integration
- **Customer Selection:** Use existing customer database
- **Purchase History:** Link sales to customer records
- **Customer Creation:** Quick customer creation from POS

### 3. Reporting Integration
- **Sales Reports:** Add POS sales to existing reports
- **Revenue Tracking:** Include POS revenue in dashboard
- **Product Performance:** Track best-selling items

### 4. Settings Integration
- **Tax Configuration:** Use existing store tax settings
- **Currency:** Use store currency settings
- **Receipt Customization:** Store-level receipt header/footer

---

## Features & Functionality

### Core Features

1. **Product Selection**
   - Search by name or SKU
   - Barcode scanning support (future enhancement)
   - Category browsing
   - Quick add buttons

2. **Shopping Cart**
   - Add/remove items
   - Adjust quantities
   - Apply item-level discounts
   - View line totals

3. **Customer Management**
   - Select existing customer
   - Quick customer creation
   - Walk-in customer option
   - Customer purchase history

4. **Payment Processing**
   - Multiple payment methods (cash, card, mobile)
   - Split payments
   - Calculate change
   - Partial payments support

5. **Receipt Generation**
   - Print receipt
   - Email receipt (future)
   - Receipt customization
   - Receipt history

6. **Sales Management**
   - View sales history
   - Filter and search sales
   - Cancel sales (with stock restoration)
   - Process refunds

### Advanced Features (Future Enhancements)

1. **Barcode Scanning**
   - USB barcode scanner support
   - Mobile camera barcode scanning

2. **Discounts & Promotions**
   - Percentage discounts
   - Fixed amount discounts
   - Coupon codes
   - Promotional pricing

3. **Loyalty Program**
   - Points accumulation
   - Rewards redemption

4. **Multi-location Support**
   - Track sales by location
   - Transfer inventory between locations

5. **Hardware Integration**
   - Receipt printer support
   - Cash drawer integration
   - Barcode scanner support

---

## Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1-2)
- [ ] Create database migrations for Sale, SaleItem, Payment models
- [ ] Update Store model with POS settings
- [ ] Create Prisma storage functions (`lib/posStorage.ts`)
- [ ] Implement basic API endpoints:
  - [ ] GET `/api/pos/sales`
  - [ ] POST `/api/pos/sales`
  - [ ] GET `/api/pos/sales/[id]`
  - [ ] GET `/api/pos/inventory/search`
- [ ] Add POS permissions to permissions system
- [ ] Write unit tests for storage functions

### Phase 2: Basic POS Interface (Week 3-4)
- [ ] Create `/app/pos/page.tsx` layout
- [ ] Implement `ProductSearch` component
- [ ] Implement `ShoppingCart` component
- [ ] Implement `CustomerSelector` component
- [ ] Implement `PaymentPanel` component
- [ ] Connect frontend to API endpoints
- [ ] Add keyboard shortcuts
- [ ] Basic styling and responsive design

### Phase 3: Sales Management (Week 5)
- [ ] Create `/app/pos/sales/page.tsx`
- [ ] Implement `SalesList` component
- [ ] Create `/app/pos/sales/[id]/page.tsx`
- [ ] Implement sale cancellation
- [ ] Add filtering and search functionality
- [ ] Export functionality

### Phase 4: Receipts & Reporting (Week 6)
- [ ] Implement receipt PDF generation
- [ ] Create `ReceiptModal` component
- [ ] Add print functionality
- [ ] Create POS stats API endpoint
- [ ] Add POS stats to dashboard
- [ ] Receipt customization settings

### Phase 5: Refunds & Advanced Features (Week 7)
- [ ] Implement refund functionality
- [ ] Stock restoration on cancellation/refund
- [ ] Partial refunds support
- [ ] Refund history tracking
- [ ] Error handling and validation improvements

### Phase 6: Testing & Polish (Week 8)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] UI/UX improvements
- [ ] Documentation
- [ ] User training materials

---

## Testing Strategy

### Unit Tests
- Storage functions (create, read, update, delete)
- Business logic (calculations, validations)
- Permission checks

### Integration Tests
- API endpoint testing
- Database transaction testing
- Inventory integration testing

### E2E Tests
- Complete sale flow
- Cancellation flow
- Refund flow
- Customer creation flow

### Manual Testing Checklist
- [ ] Create sale with inventory items
- [ ] Create sale with non-inventory items
- [ ] Create sale with customer
- [ ] Create sale without customer (walk-in)
- [ ] Apply discounts
- [ ] Process payment (cash, card)
- [ ] Print receipt
- [ ] Cancel sale
- [ ] Process refund
- [ ] Stock deduction verification
- [ ] Stock restoration on cancel/refund
- [ ] Sales history filtering
- [ ] Permission checks for all roles

---

## File Structure

```
/app
  /pos
    page.tsx                    # Main POS interface
    /sales
      page.tsx                  # Sales history
      [id]
        page.tsx                # Sale details
/api
  /pos
    /sales
      route.ts                  # List/create sales
      [id]
        route.ts                # Get sale details
        /cancel
          route.ts              # Cancel sale
        /refund
          route.ts              # Process refund
    /inventory
      /search
        route.ts                # Quick inventory search
    /receipt
      [saleId]
        route.ts                # Generate receipt PDF
    /stats
      route.ts                  # POS statistics
/components
  /pos
    ProductSearch.tsx
    ShoppingCart.tsx
    CustomerSelector.tsx
    PaymentPanel.tsx
    SalesList.tsx
    ReceiptModal.tsx
    SaleDetails.tsx
/lib
  posStorage.ts                 # POS database operations
/types
  pos.ts                        # POS TypeScript types
/styles
  _pos.scss                     # POS-specific styles
/prisma
  /migrations
    YYYYMMDDHHMMSS_add_pos_tables.sql
```

---

## Technical Considerations

### 1. Sale Number Generation
- Format: `SALE-{storeId}-{sequential}` or `SALE-{timestamp}`
- Ensure uniqueness per store
- Consider using database sequence or timestamp-based approach

### 2. Inventory Deduction
- Use database transactions to ensure atomicity
- Handle concurrent sales of same item
- Check stock availability before deduction

### 3. Tax Calculation
- Use store tax settings (taxRate, taxInclusive)
- Support tax-inclusive and tax-exclusive pricing
- Store tax amount per line item

### 4. Receipt Generation
- Use existing PDF generation library (`@react-pdf/renderer`)
- Support store branding (logo, colors)
- Include all sale details, payment info, store info

### 5. Performance
- Optimize inventory search queries
- Cache frequently accessed products
- Paginate sales history
- Index database fields appropriately

### 6. Security
- Validate all inputs
- Check permissions on all endpoints
- Prevent negative quantities
- Audit log for cancellations/refunds

---

## Localization

Add POS-related translations to:
- `locales/en.json`
- `locales/bg.json`
- `locales/de.json`

Key translation keys:
```json
{
  "pos": {
    "title": "Point of Sale",
    "sales": "Sales",
    "newSale": "New Sale",
    "productSearch": "Search Products",
    "shoppingCart": "Shopping Cart",
    "customer": "Customer",
    "payment": "Payment",
    "subtotal": "Subtotal",
    "tax": "Tax",
    "discount": "Discount",
    "total": "Total",
    "amountPaid": "Amount Paid",
    "change": "Change",
    "completeSale": "Complete Sale",
    "receipt": "Receipt",
    "printReceipt": "Print Receipt",
    "cancelSale": "Cancel Sale",
    "processRefund": "Process Refund",
    "saleNumber": "Sale Number",
    "paymentMethod": "Payment Method",
    "cash": "Cash",
    "card": "Card",
    "mobile": "Mobile Payment",
    "walkInCustomer": "Walk-in Customer",
    "addCustomer": "Add Customer",
    "selectCustomer": "Select Customer",
    "noItemsInCart": "No items in cart",
    "insufficientStock": "Insufficient stock",
    "saleCompleted": "Sale completed successfully",
    "saleCancelled": "Sale cancelled",
    "refundProcessed": "Refund processed successfully"
  }
}
```

---

## Success Metrics

- **Functionality:** All core features working as expected
- **Performance:** Sale creation < 500ms
- **Usability:** Complete sale in < 2 minutes
- **Reliability:** 99.9% transaction success rate
- **Integration:** Seamless inventory and customer integration

---

## Future Enhancements

1. **Barcode Scanner Integration**
   - USB scanner support
   - Mobile camera scanning

2. **Advanced Discounts**
   - Percentage discounts
   - Buy X Get Y
   - Coupon codes

3. **Loyalty Program**
   - Points system
   - Rewards redemption

4. **Hardware Integration**
   - Receipt printers
   - Cash drawers
   - Customer displays

5. **Offline Mode**
   - Local storage for offline sales
   - Sync when online

6. **Multi-payment Support**
   - Split payments
   - Gift cards
   - Store credit

---

## Notes

- This plan assumes POS is enabled per store (via `posEnabled` flag)
- Consider adding a "POS Mode" toggle in settings
- Ensure mobile responsiveness for tablet-based POS systems
- Consider adding keyboard shortcuts for power users
- Plan for receipt printer integration from the start (even if not implemented initially)

---

## Questions to Resolve

1. **Sale Number Format:** Sequential vs timestamp-based?
2. **Partial Payments:** Should we support partial payments initially?
3. **Receipt Printer:** Which printer protocol to support? (ESC/POS, Star, etc.)
4. **Barcode Scanning:** Priority for implementation?
5. **Offline Mode:** Required for MVP or future enhancement?

---

*Last Updated: [Current Date]*
*Version: 1.0*

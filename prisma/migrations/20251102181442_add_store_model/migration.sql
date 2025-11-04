-- CreateTable: Create stores table
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- Create a default store for existing data
INSERT INTO "stores" ("id", "name", "onboarded", "created_at", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Store', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add store_id column to users table (nullable first)
ALTER TABLE "users" ADD COLUMN "store_id" TEXT;

-- Update all existing users to use the default store
UPDATE "users" SET "store_id" = '00000000-0000-0000-0000-000000000000' WHERE "store_id" IS NULL;

-- Make store_id NOT NULL and add foreign key
ALTER TABLE "users" ALTER COLUMN "store_id" SET NOT NULL;
CREATE INDEX "users_store_id_idx" ON "users"("store_id");
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add store_id column to customers table (nullable first)
ALTER TABLE "customers" ADD COLUMN "store_id" TEXT;

-- Update all existing customers to use the default store
UPDATE "customers" SET "store_id" = '00000000-0000-0000-0000-000000000000' WHERE "store_id" IS NULL;

-- Make store_id NOT NULL and add foreign key
ALTER TABLE "customers" ALTER COLUMN "store_id" SET NOT NULL;
CREATE INDEX "customers_store_id_idx" ON "customers"("store_id");
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove the old unique constraint on email and add composite unique constraint
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_email_key";
CREATE UNIQUE INDEX "customers_store_id_email_key" ON "customers"("store_id", "email");

-- Add store_id column to repair_tickets table (nullable first)
ALTER TABLE "repair_tickets" ADD COLUMN "store_id" TEXT;

-- Update all existing tickets to use the default store
UPDATE "repair_tickets" SET "store_id" = '00000000-0000-0000-0000-000000000000' WHERE "store_id" IS NULL;

-- Make store_id NOT NULL and add foreign key
ALTER TABLE "repair_tickets" ALTER COLUMN "store_id" SET NOT NULL;
CREATE INDEX "repair_tickets_store_id_idx" ON "repair_tickets"("store_id");
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


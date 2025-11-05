-- Create enum type
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER');

-- Add role column to users table
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'VIEWER';

-- Set existing users as ADMIN (first user in each store)
UPDATE "users" u1
SET "role" = 'ADMIN'
WHERE u1.id = (
  SELECT u2.id
  FROM "users" u2
  WHERE u2.store_id = u1.store_id
  ORDER BY u2.created_at ASC
  LIMIT 1
);

-- Add other new fields
ALTER TABLE "users" ADD COLUMN "invited_by" TEXT;
ALTER TABLE "users" ADD COLUMN "invited_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Add foreign key for inviter
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_fkey" 
  FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- Create indexes
CREATE INDEX "users_store_id_role_idx" ON "users"("store_id", "role");
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- Create user_invitations table
CREATE TABLE "user_invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "invited_by" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_store_id_fkey" 
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE;
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_fkey" 
  FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE;

-- Create unique constraint and indexes
CREATE UNIQUE INDEX "user_invitations_store_id_email_key" ON "user_invitations"("store_id", "email");
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations"("expires_at");


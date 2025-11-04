-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token_expiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_verification_email_sent" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_verification_token_idx" ON "users"("verification_token");


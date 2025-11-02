-- Step 1: Add store_id column (nullable initially)
ALTER TABLE "user_settings" ADD COLUMN "store_id" TEXT;

-- Step 2: Migrate data from user_id to store_id
-- Update store_id by joining with users table
UPDATE "user_settings" 
SET "store_id" = (
  SELECT "store_id" 
  FROM "users" 
  WHERE "users"."id" = "user_settings"."user_id"
)
WHERE "store_id" IS NULL;

-- Step 3: Handle duplicate settings per store (keep the first one, delete others)
-- Delete duplicate settings, keeping only one per store
DELETE FROM "user_settings" us1
WHERE EXISTS (
  SELECT 1 
  FROM "user_settings" us2 
  WHERE us2."store_id" = us1."store_id" 
  AND us2."id" < us1."id"
);

-- Step 4: Make store_id NOT NULL and add unique constraint
ALTER TABLE "user_settings" ALTER COLUMN "store_id" SET NOT NULL;
CREATE UNIQUE INDEX "user_settings_store_id_key" ON "user_settings"("store_id");

-- Step 5: Drop old foreign key constraint and index
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_user_id_fkey";
DROP INDEX IF EXISTS "user_settings_user_id_key";
DROP INDEX IF EXISTS "user_settings_user_id_idx";

-- Step 6: Drop user_id column
ALTER TABLE "user_settings" DROP COLUMN "user_id";

-- Step 7: Rename table
ALTER TABLE "user_settings" RENAME TO "settings";

-- Step 8: Create new index on store_id
CREATE INDEX "settings_store_id_idx" ON "settings"("store_id");

-- Step 9: Add foreign key constraint to stores table
ALTER TABLE "settings" ADD CONSTRAINT "settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;


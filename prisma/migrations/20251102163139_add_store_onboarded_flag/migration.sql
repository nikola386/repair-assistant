-- DropIndex
DROP INDEX "public"."customers_email_key";

-- AlterTable
ALTER TABLE "settings" RENAME CONSTRAINT "user_settings_pkey" TO "settings_pkey";

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false;

-- RenameIndex
ALTER INDEX "user_settings_store_id_key" RENAME TO "settings_store_id_key";

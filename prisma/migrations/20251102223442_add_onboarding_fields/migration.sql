-- AlterTable
ALTER TABLE "stores" ADD COLUMN "street" TEXT;
ALTER TABLE "stores" ADD COLUMN "city" TEXT;
ALTER TABLE "stores" ADD COLUMN "state" TEXT;
ALTER TABLE "stores" ADD COLUMN "postal_code" TEXT;
ALTER TABLE "stores" ADD COLUMN "country" TEXT;
ALTER TABLE "stores" ADD COLUMN "currency" TEXT DEFAULT 'USD';
ALTER TABLE "stores" ADD COLUMN "vat_number" TEXT;


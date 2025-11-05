-- Add tax fields to stores table
ALTER TABLE "stores" ADD COLUMN "tax_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stores" ADD COLUMN "tax_rate" DECIMAL(5, 2);
ALTER TABLE "stores" ADD COLUMN "tax_inclusive" BOOLEAN NOT NULL DEFAULT false;


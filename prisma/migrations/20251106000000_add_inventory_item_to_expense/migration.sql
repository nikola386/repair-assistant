-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "inventory_item_id" TEXT;

-- CreateIndex
CREATE INDEX "expenses_inventory_item_id_idx" ON "expenses"("inventory_item_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;


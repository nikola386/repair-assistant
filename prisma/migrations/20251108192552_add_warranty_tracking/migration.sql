-- AlterTable
ALTER TABLE "settings" ADD COLUMN "default_warranty_period_days" INTEGER DEFAULT 30;

-- CreateTable
CREATE TABLE "warranties" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "warranty_period_days" INTEGER NOT NULL DEFAULT 30,
    "start_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "warranty_type" TEXT NOT NULL DEFAULT 'both',
    "status" TEXT NOT NULL DEFAULT 'active',
    "terms" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_claims" (
    "id" TEXT NOT NULL,
    "warranty_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "issue_description" TEXT NOT NULL,
    "claim_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution_notes" TEXT,
    "resolution_date" DATE,
    "related_ticket_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warranties_ticket_id_key" ON "warranties"("ticket_id");

-- CreateIndex
CREATE INDEX "warranties_store_id_idx" ON "warranties"("store_id");

-- CreateIndex
CREATE INDEX "warranties_customer_id_idx" ON "warranties"("customer_id");

-- CreateIndex
CREATE INDEX "warranties_status_idx" ON "warranties"("status");

-- CreateIndex
CREATE INDEX "warranties_expiry_date_idx" ON "warranties"("expiry_date");

-- CreateIndex
CREATE INDEX "warranties_ticket_id_idx" ON "warranties"("ticket_id");

-- CreateIndex
CREATE INDEX "warranty_claims_warranty_id_idx" ON "warranty_claims"("warranty_id");

-- CreateIndex
CREATE INDEX "warranty_claims_store_id_idx" ON "warranty_claims"("store_id");

-- CreateIndex
CREATE INDEX "warranty_claims_status_idx" ON "warranty_claims"("status");

-- CreateIndex
CREATE INDEX "warranty_claims_claim_date_idx" ON "warranty_claims"("claim_date");

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_warranty_id_fkey" FOREIGN KEY ("warranty_id") REFERENCES "warranties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_related_ticket_id_fkey" FOREIGN KEY ("related_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;


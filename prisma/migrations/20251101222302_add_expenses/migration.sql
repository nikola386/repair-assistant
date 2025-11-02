-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_ticket_id_idx" ON "expenses"("ticket_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

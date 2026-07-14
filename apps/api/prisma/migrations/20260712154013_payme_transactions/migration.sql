-- Payme Merchant API tranzaksiyalari
CREATE TABLE "payme_transactions" (
    "id" UUID NOT NULL,
    "payme_id" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "create_time" BIGINT NOT NULL,
    "perform_time" BIGINT NOT NULL DEFAULT 0,
    "cancel_time" BIGINT NOT NULL DEFAULT 0,
    "reason" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payme_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payme_transactions_payme_id_key" ON "payme_transactions"("payme_id");
CREATE INDEX "payme_transactions_invoice_id_idx" ON "payme_transactions"("invoice_id");

ALTER TABLE "payme_transactions"
  ADD CONSTRAINT "payme_transactions_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

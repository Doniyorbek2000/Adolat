-- Click Merchant API tranzaksiyalari (Prepare/Complete)
CREATE TABLE "click_transactions" (
    "id" UUID NOT NULL,
    "click_trans_id" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "merchant_prepare_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "click_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "click_transactions_click_trans_id_key" ON "click_transactions"("click_trans_id");
CREATE INDEX "click_transactions_invoice_id_idx" ON "click_transactions"("invoice_id");
ALTER TABLE "click_transactions" ADD CONSTRAINT "click_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

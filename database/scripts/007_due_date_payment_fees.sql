-- Opcional: bases criadas antes do Prisma incluir estes campos.
-- Com `npx prisma db push` as colunas costumam ser criadas automaticamente.

ALTER TABLE expense_purchases
  ADD COLUMN IF NOT EXISTS due_date DATE;

UPDATE expense_purchases
SET due_date = purchase_date
WHERE due_date IS NULL;

ALTER TABLE card_invoice_payments
  ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE card_invoice_payments
  ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

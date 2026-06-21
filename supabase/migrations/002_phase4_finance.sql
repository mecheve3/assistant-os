-- ─── Phase 4: Finance Module Schema Updates ──────────────────────────────────
-- Run in Supabase SQL Editor before starting Phase 4

ALTER TABLE finances_debts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'credit_card';
ALTER TABLE finances_debts ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC;
ALTER TABLE finances_debts ADD COLUMN IF NOT EXISTS balance_usd NUMERIC;
ALTER TABLE finances_debts ADD COLUMN IF NOT EXISTS minimum_payment_cop NUMERIC;
ALTER TABLE finances_debts ADD COLUMN IF NOT EXISTS minimum_payment_usd NUMERIC;

ALTER TABLE finances_transactions ADD COLUMN IF NOT EXISTS gross_amount NUMERIC;
ALTER TABLE finances_transactions ADD COLUMN IF NOT EXISTS deductions NUMERIC;
ALTER TABLE finances_transactions ADD COLUMN IF NOT EXISTS net_amount NUMERIC;

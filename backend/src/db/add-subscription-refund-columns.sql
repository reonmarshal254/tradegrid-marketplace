-- Add refund tracking columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS refund_approved_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);

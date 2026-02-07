-- Add Stripe-related fields to organizations table
ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN subscription_status TEXT DEFAULT 'none';
ALTER TABLE organizations ADD COLUMN current_period_end TIMESTAMPTZ;
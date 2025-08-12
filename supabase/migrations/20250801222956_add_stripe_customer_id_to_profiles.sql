-- Add stripe_customer_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
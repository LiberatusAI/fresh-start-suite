-- Add purchased requests to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS purchased_requests integer DEFAULT 0;

-- Track purchases for Stripe reconciliation
CREATE TABLE IF NOT EXISTS request_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE NOT NULL,
  requests_purchased integer NOT NULL,
  amount_paid numeric(10,2) NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending', -- pending, completed, failed
  created_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies
ALTER TABLE request_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON request_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage purchases" ON request_purchases
  FOR ALL TO service_role USING (true);

-- Update the increment function to handle reset of purchased requests
CREATE OR REPLACE FUNCTION increment_monthly_requests(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if user needs a reset
  IF needs_monthly_reset(user_id) THEN
    UPDATE profiles 
    SET 
      monthly_chat_requests = 1,
      purchased_requests = 0,  -- Clear purchased requests on reset
      last_monthly_reset_date = CURRENT_DATE
    WHERE id = user_id;
  ELSE
    UPDATE profiles 
    SET monthly_chat_requests = monthly_chat_requests + 1
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment for clarity
COMMENT ON COLUMN profiles.purchased_requests IS 'Additional requests purchased via Stripe. Expire at monthly reset.';
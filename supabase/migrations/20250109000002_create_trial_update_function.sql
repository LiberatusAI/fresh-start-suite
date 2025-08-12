-- Create a function to update user trial subscription
CREATE OR REPLACE FUNCTION update_user_trial_subscription(
  user_id UUID,
  trial_tier_id UUID,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    subscription_tier_id = trial_tier_id,
    is_trial_user = true,
    trial_start_date = trial_start_date,
    trial_end_date = trial_end_date,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
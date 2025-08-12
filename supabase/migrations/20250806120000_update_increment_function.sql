-- ============================================================================
-- Update increment_daily_requests RPC function to handle all counting logic  
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_daily_requests(user_id UUID)
RETURNS VOID AS $$
DECLARE
  today DATE := CURRENT_DATE;
  last_date DATE;
BEGIN
  -- Get the user's last chat date
  SELECT last_chat_date::DATE INTO last_date 
  FROM profiles 
  WHERE id = user_id;
  
  -- Check if this is a new day or same day
  IF last_date = today THEN
    -- Same day: increment existing count
    UPDATE profiles 
    SET daily_chat_requests = daily_chat_requests + 1
    WHERE id = user_id;
  ELSE
    -- New day or first time: reset to 1 and update date
    UPDATE profiles 
    SET daily_chat_requests = 1,
        last_chat_date = today
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
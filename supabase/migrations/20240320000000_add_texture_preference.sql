-- Add texture_preference column to profiles table
ALTER TABLE public.profiles ADD COLUMN texture_preference boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.texture_preference IS 'Whether to show the marble texture in the background. Defaults to false (plain background).'; 
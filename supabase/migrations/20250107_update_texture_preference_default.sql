-- Update texture_preference default value to false (plain background)
-- First, update the column default for new users
ALTER TABLE public.profiles ALTER COLUMN texture_preference SET DEFAULT false;

-- Update existing users who have null texture_preference to false (plain background)
UPDATE public.profiles 
SET texture_preference = false 
WHERE texture_preference IS NULL;

-- Update the comment to reflect the new default
COMMENT ON COLUMN public.profiles.texture_preference IS 'Whether to show the marble texture in the background. Defaults to false (plain background).'; 
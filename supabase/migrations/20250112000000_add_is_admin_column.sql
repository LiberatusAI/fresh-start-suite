-- Add is_admin column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_admin boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.profiles.is_admin IS 'Whether the user has admin privileges. Defaults to false.';

-- Add index for admin queries
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin); 
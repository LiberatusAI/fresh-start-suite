// Lovable environment configuration
// Replace these with your actual values in Lovable's environment settings

export const env = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  VITE_STRIPE_INTRO_MONTHLY_PLAN_ID: import.meta.env.VITE_STRIPE_INTRO_MONTHLY_PLAN_ID || '',
  VITE_STRIPE_PRO_MONTHLY_PLAN_ID: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PLAN_ID || '',
  VITE_STRIPE_ELITE_MONTHLY_PLAN_ID: import.meta.env.VITE_STRIPE_ELITE_MONTHLY_PLAN_ID || '',
  VITE_ENABLE_VALUE_FIRST_ONBOARDING: import.meta.env.VITE_ENABLE_VALUE_FIRST_ONBOARDING === 'true',
};
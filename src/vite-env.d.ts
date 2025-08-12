/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_INTRO_MONTHLY_PLAN_ID: string
  readonly VITE_STRIPE_PRO_MONTHLY_PLAN_ID: string
  readonly VITE_STRIPE_ELITE_MONTHLY_PLAN_ID: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

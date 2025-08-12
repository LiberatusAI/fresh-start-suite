# Deployment Environment Variables

⚠️ **CRITICAL WARNING**: 
- NEVER copy .env or .env.local files to deployment
- NEVER use localhost URLs in production
- ALWAYS manually enter production values in Lovable settings
- The values below are EXAMPLES - get your actual production values

## Frontend (Lovable Environment Settings)

These variables must be set in Lovable's project settings:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://eyggysehyeptgtvninwi.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_INTRO_MONTHLY_PLAN_ID=price_1RrJztJk8bLGmbLeztlumA6L
VITE_STRIPE_PRO_MONTHLY_PLAN_ID=price_1RrP1xJk8bLGmbLeAH6Ji7tj
VITE_STRIPE_ELITE_MONTHLY_PLAN_ID=price_1RrP2PJk8bLGmbLe0oVynKUo

# Feature Flags
VITE_ENABLE_VALUE_FIRST_ONBOARDING=true
```

## Edge Functions (Supabase Dashboard)

These variables must be set in Supabase Dashboard > Edge Functions > Secrets:

```bash
# Stripe Backend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_1RrJztJk8bLGmbLeztlumA6L
VITE_STRIPE_TRIAL_PRICE_ID=price_1RtlRcJk8bLGmbLeCL2ZK3gn

# API Keys
GEMINI_API_KEY=AIzaSy...
SANTIMENT_API_KEY=n7smg2...
RESEND_API_KEY=(optional - for email features)
PDF_API_KEY=(optional - for PDF reports)

# URLs
FRONTEND_URL=https://your-app.lovable.app
```

## Getting the Values

1. **Supabase**: Get from Supabase Dashboard > Settings > API
2. **Stripe**: Get from Stripe Dashboard > Developers > API Keys
3. **Gemini**: Get from Google AI Studio
4. **Santiment**: Get from Santiment account

## Deployment Steps

1. Set all VITE_ variables in Lovable project settings
2. Deploy to Lovable to get your app URL
3. Update FRONTEND_URL in Supabase with your Lovable URL
4. Set all Edge Function secrets in Supabase Dashboard
5. Deploy Edge Functions: `supabase functions deploy --project-ref eyggysehyeptgtvninwi`
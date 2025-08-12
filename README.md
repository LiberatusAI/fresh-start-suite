# Future Cast - Premium Crypto Asset Analytics

<!-- Lovable Preview Test: 2025-08-12 14:58 UTC -->

Future Cast is a sophisticated cryptocurrency analytics platform that provides institutional-grade insights and reporting for crypto investors. The platform offers real-time metrics, AI-powered analysis, and automated daily reports to help users make informed investment decisions.

## Key Features

- **Value-First Onboarding**: Streamlined signup process that lets users explore assets before choosing a subscription
- **Advanced Analytics**: Track key metrics including RSI, price movements, exchange flows, and dormancy rates
- **AI-Powered Insights**: Automated asset analysis with ChatGPT integration for market commentary
- **Daily Reports**: Automated PDF reports delivered via email with comprehensive asset analysis
- **Multi-Tier Subscriptions**: Flexible plans from free trial to elite tier supporting up to 100 assets
- **Real-Time Data**: Integration with multiple data providers for up-to-date market information

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Email**: Resend
- **Charts**: Recharts
- **State Management**: React Query

## Getting Started

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Create .env file with required variables (see .env.example)

# Start development server
npm run dev
```

## Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_ENABLE_VALUE_FIRST_ONBOARDING` (optional, defaults to true)

## Deployment

The application can be deployed to any hosting service that supports Node.js applications:
- Vercel
- Netlify
- Railway
- Or any other modern hosting platform

Ensure all environment variables are properly configured in your deployment environment.
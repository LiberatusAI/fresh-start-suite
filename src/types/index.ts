export type SubscriptionTier = 'trial' | 'basic' | 'pro' | 'elite';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  subscriptionTierId?: string;
  createdAt: Date;
}

export interface CryptoAsset {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  icon: string;
  currentPrice?: number;
  priceChange24h?: number;
}

export interface AssetSubscription {
  id: string;
  userId: string;
  assetId: string;
  reportSchedules: ReportSchedule[];
  lastReportSent?: Date;
}

export interface ReportSchedule {
  id: string;
  time: string; // Format: 'HH:MM' in 24-hour format
  days: string[]; // ['monday', 'tuesday', etc.] or ['daily']
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  price: number;
  maxAssets: number;
  maxReportsPerDay: number;
  additionalAssetPrice: number;
  additionalReportPrice?: number;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'cancelled' | 'expired';
}

export interface SubscriptionTierDetails {
  id: string;
  name: SubscriptionTier;
  price: number;
  maxAssets: number;
  maxReportsPerDay: number;
  additionalAssetPrice: number;
  additionalReportPrice?: number;
}

export const SUBSCRIPTION_TIERS = {
  trial: {
    price: 0, // Free trial
    maxAssets: 1,
    maxReportsPerDay: 1,
    additionalAssetPrice: 0,
    trialDays: 7,
  },
  basic: {
    price: 19.99, // Monthly price
    maxAssets: 5,
    maxReportsPerDay: 1,
    additionalAssetPrice: 1.99,
  },
  pro: {
    price: 49.99, // Monthly price
    maxAssets: 20,
    maxReportsPerDay: 3,
    additionalAssetPrice: 1.99,
  },
  elite: {
    price: 99.99, // Monthly price
    maxAssets: 999999, // Effectively unlimited assets
    maxReportsPerDay: 24,
    additionalAssetPrice: 0,
    additionalReportPrice: 0.99,
  },
};

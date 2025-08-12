import { SubscriptionTier } from '@/types';

export type SubscriptionDetailsProps = {
  name: string;
  price: string;
  assets: string;
  reports: string;
};

export function getSubscriptionDetails(
  tier: SubscriptionTier, 
  tierDetails?: { 
    name: SubscriptionTier;
    price: number;
    maxAssets: number;
    maxReportsPerDay: number;
  } | null,
  allTiers?: Array<{
    id: string;
    name: SubscriptionTier;
    price: number;
    maxAssets: number;
    maxReportsPerDay: number;
  }>
): SubscriptionDetailsProps {
  // If we have tierDetails, use that, otherwise fall back to allTiers
  if (tierDetails && tierDetails.name === tier) {
    return {
      name: tierDetails.name.charAt(0).toUpperCase() + tierDetails.name.slice(1),
      price: `$${tierDetails.price}/month`,
      assets: tierDetails.name === 'institutional' 
        ? 'All assets'
        : `Up to ${tierDetails.maxAssets} asset${tierDetails.maxAssets > 1 ? 's' : ''}`,
      reports: `Up to ${tierDetails.maxReportsPerDay} report${tierDetails.maxReportsPerDay > 1 ? 's' : ''} per day`,
    };
  }
  
  // Find tier in allTiers
  const foundTier = allTiers?.find(t => t.name === tier);
  if (foundTier) {
    return {
      name: foundTier.name.charAt(0).toUpperCase() + foundTier.name.slice(1),
      price: `$${foundTier.price}/month`,
      assets: foundTier.name === 'institutional' 
        ? 'All assets'
        : `Up to ${foundTier.maxAssets} asset${foundTier.maxAssets > 1 ? 's' : ''}`,
      reports: `Up to ${foundTier.maxReportsPerDay} report${foundTier.maxReportsPerDay > 1 ? 's' : ''} per day`,
    };
  }
  
  // Fall back to default values
  switch (tier) {
    case 'trial':
      return {
        name: 'Free Trial',
        price: 'Free for 7 days',
        assets: '1 asset for 7 days',
        reports: '1 report per day',
      };
    case 'basic':
      return {
        name: 'Basic',
        price: '$19.99/month',
        assets: '5 assets included',
        reports: 'Daily reports',
      };
    case 'pro':
      return {
        name: 'Pro',
        price: '$49.99/month',
        assets: 'Up to 20 assets',
        reports: 'Up to 3 reports per day',
      };
    case 'elite':
      return {
        name: 'Elite',
        price: '$99.99/month',
        assets: 'Unlimited assets',
        reports: 'Up to 24 reports per day',
      };
    default:
      return {
        name: 'Basic',
        price: '$19.99/month',
        assets: '5 assets included',
        reports: 'Daily reports',
      };
  }
} 